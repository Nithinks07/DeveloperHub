import uuid
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.models.issue import Issue
from app.models.issue_comment import IssueComment
from app.models.label import Label, issue_labels
from app.models.user import User
from app.repositories.issue import IssueRepository
from app.repositories.issue_comment import IssueCommentRepository
from app.repositories.label import LabelRepository
from app.repositories.repository import RepositoryRepository
from app.schemas.issue import IssueCreate, IssueUpdate, IssueCommentCreate, IssueCommentResponse
from app.services.repository_service import _require_org_member


async def create_issue(
    db: AsyncSession,
    user: User,
    repository_id: uuid.UUID,
    data: IssueCreate,
) -> Issue:
    repo_repo = RepositoryRepository(db)
    issue_repo = IssueRepository(db)

    # Validate repo and permissions (developer+)
    repo = await repo_repo.get(repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    await _require_org_member(db, user.id, repo.organization_id, min_role="developer")

    next_num = await issue_repo.get_next_number(repository_id)

    issue_dict = data.model_dump(exclude_unset=True)
    issue_dict["repository_id"] = repository_id
    issue_dict["number"] = next_num
    issue_dict["created_by"] = user.id
    
    # Optional task_id validation skipped due to v1.1 architecture Note: Lane C task validation

    issue = await issue_repo.create(issue_dict)
    
    # Eager load relationships for response
    await db.refresh(issue, ["assignee", "creator"])
    return issue


async def list_issues(
    db: AsyncSession,
    repository_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[List[Issue], int]:
    issue_repo = IssueRepository(db)
    
    filters = {"repository_id": repository_id}
    # Eager load minimal required fields (assignee is often useful, but not strictly asked except in details)
    # The contract just says "...issue object...".
    
    return await issue_repo.list_with_count(
        filters=filters,
        page=page,
        page_size=page_size,
    )


async def get_issue_threaded(
    db: AsyncSession,
    issue_id: uuid.UUID,
) -> dict:
    issue_repo = IssueRepository(db)
    
    # Get issue with labels and comments
    result = await db.execute(
        select(Issue)
        .options(
            selectinload(Issue.labels),
            selectinload(Issue.comments).selectinload(IssueComment.author),
        )
        .where(Issue.id == issue_id)
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    issue_dict = {
        "id": issue.id,
        "repository_id": issue.repository_id,
        "task_id": issue.task_id,
        "number": issue.number,
        "title": issue.title,
        "description": issue.description,
        "status": issue.status,
        "type": issue.type,
        "priority": issue.priority,
        "assigned_to": issue.assigned_to,
        "milestone_id": issue.milestone_id,
        "created_by": issue.created_by,
        "created_at": issue.created_at,
        "updated_at": issue.updated_at,
        "labels": issue.labels,
    }

    # Threading logic
    comments_by_id = {}
    for comment in issue.comments:
        c_dict = {
            "id": comment.id,
            "issue_id": comment.issue_id,
            "parent_comment_id": comment.parent_comment_id,
            "author": comment.author,
            "content": comment.content,
            "created_at": comment.created_at,
            "replies": []
        }
        comments_by_id[comment.id] = c_dict

    root_comments = []
    for comment in issue.comments:
        c_dict = comments_by_id[comment.id]
        if comment.parent_comment_id:
            parent_dict = comments_by_id.get(comment.parent_comment_id)
            if parent_dict:
                parent_dict["replies"].append(c_dict)
            else:
                # Fallback if parent missing
                root_comments.append(c_dict)
        else:
            root_comments.append(c_dict)
            
    # Sort root comments by created_at (and replies too if needed, though they are usually appended in order)
    root_comments.sort(key=lambda x: x["created_at"])
    
    # Sort replies
    for c in comments_by_id.values():
        c["replies"].sort(key=lambda x: x["created_at"])
        
    issue_dict["comments"] = root_comments
    return issue_dict


async def update_issue(
    db: AsyncSession,
    user: User,
    issue_id: uuid.UUID,
    data: IssueUpdate,
) -> Issue:
    issue_repo = IssueRepository(db)
    issue = await issue_repo.get(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    repo_repo = RepositoryRepository(db)
    repo = await repo_repo.get(issue.repository_id)
    await _require_org_member(db, user.id, repo.organization_id, min_role="developer")
    
    return await issue_repo.update(issue, data.model_dump(exclude_unset=True))


async def delete_issue(
    db: AsyncSession,
    user: User,
    issue_id: uuid.UUID,
) -> None:
    issue_repo = IssueRepository(db)
    issue = await issue_repo.get(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    repo_repo = RepositoryRepository(db)
    repo = await repo_repo.get(issue.repository_id)
    await _require_org_member(db, user.id, repo.organization_id, min_role="developer")
    
    await issue_repo.delete(issue)


async def add_label(
    db: AsyncSession,
    user: User,
    issue_id: uuid.UUID,
    label_id: uuid.UUID,
) -> Issue:
    issue_repo = IssueRepository(db)
    issue = await issue_repo.get(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    repo_repo = RepositoryRepository(db)
    repo = await repo_repo.get(issue.repository_id)
    await _require_org_member(db, user.id, repo.organization_id, min_role="developer")
    
    label_repo = LabelRepository(db)
    label = await label_repo.get(label_id)
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
        
    # Check if already has label
    await db.execute(
        issue_labels.insert().values(issue_id=issue_id, label_id=label_id).prefix_with("ON CONFLICT DO NOTHING")
    )
    await db.commit()
    return await get_issue_threaded(db, issue_id)


async def remove_label(
    db: AsyncSession,
    user: User,
    issue_id: uuid.UUID,
    label_id: uuid.UUID,
) -> Issue:
    issue_repo = IssueRepository(db)
    issue = await issue_repo.get(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    repo_repo = RepositoryRepository(db)
    repo = await repo_repo.get(issue.repository_id)
    await _require_org_member(db, user.id, repo.organization_id, min_role="developer")
    
    await db.execute(
        issue_labels.delete().where(
            issue_labels.c.issue_id == issue_id,
            issue_labels.c.label_id == label_id
        )
    )
    await db.commit()
    return await get_issue_threaded(db, issue_id)


async def create_comment(
    db: AsyncSession,
    user: User,
    issue_id: uuid.UUID,
    data: IssueCommentCreate,
) -> IssueComment:
    issue_repo = IssueRepository(db)
    issue = await issue_repo.get(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    repo_repo = RepositoryRepository(db)
    repo = await repo_repo.get(issue.repository_id)
    await _require_org_member(db, user.id, repo.organization_id, min_role="developer")
    
    comment_repo = IssueCommentRepository(db)
    
    if data.parent_comment_id:
        parent = await comment_repo.get(data.parent_comment_id)
        if not parent or parent.issue_id != issue_id:
            raise HTTPException(status_code=400, detail="Parent comment invalid or from another issue")
            
    comment = await comment_repo.create({
        "issue_id": issue_id,
        "author_id": user.id,
        "parent_comment_id": data.parent_comment_id,
        "content": data.content,
    })
    
    await db.refresh(comment, ["author"])
    return comment


async def delete_comment(
    db: AsyncSession,
    user: User,
    comment_id: uuid.UUID,
) -> None:
    comment_repo = IssueCommentRepository(db)
    comment = await comment_repo.get(comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    issue_repo = IssueRepository(db)
    issue = await issue_repo.get(comment.issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    if comment.author_id != user.id and issue.created_by != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
        
    await comment_repo.delete(comment)
