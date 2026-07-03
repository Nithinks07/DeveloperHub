import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.models.pull_request import PullRequest
from app.models.pr_comment import PRComment
from app.models.pr_review import PRReview
from app.models.user import User
from app.models.issue import Issue
from app.repositories.pull_request import PullRequestRepository
from app.repositories.pr_comment import PRCommentRepository
from app.repositories.pr_review import PRReviewRepository
from app.repositories.repository import RepositoryRepository
from app.repositories.issue import IssueRepository
from app.schemas.pull_request import (
    PullRequestCreate, 
    PRCommentCreate, 
    PRReviewCreate
)
from app.services.repository_service import _require_org_member


async def create_pull_request(
    db: AsyncSession,
    user: User,
    repository_id: uuid.UUID,
    data: PullRequestCreate,
) -> PullRequest:
    repo_repo = RepositoryRepository(db)
    pr_repo = PullRequestRepository(db)

    # Validate repo and permissions (developer+)
    repo = await repo_repo.get(repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    await _require_org_member(db, user.id, repo.organization_id, min_role="developer")

    if data.issue_id:
        issue_repo = IssueRepository(db)
        issue = await issue_repo.get(data.issue_id)
        if not issue or issue.repository_id != repository_id:
            raise HTTPException(status_code=400, detail="Linked issue must belong to the same repository")

    next_num = await pr_repo.get_next_number(repository_id)

    pr_dict = data.model_dump(exclude_unset=True)
    pr_dict["repository_id"] = repository_id
    pr_dict["number"] = next_num
    pr_dict["author_id"] = user.id
    
    pr = await pr_repo.create(pr_dict)
    
    await db.refresh(pr)
    return pr


async def list_pull_requests(
    db: AsyncSession,
    repository_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[List[PullRequest], int]:
    pr_repo = PullRequestRepository(db)
    
    filters = {"repository_id": repository_id}
    
    return await pr_repo.list_with_count(
        filters=filters,
        page=page,
        page_size=page_size,
    )


async def get_pull_request_threaded(
    db: AsyncSession,
    pr_id: uuid.UUID,
) -> dict:
    # Get PR with comments and reviews
    result = await db.execute(
        select(PullRequest)
        .options(
            selectinload(PullRequest.author),
            selectinload(PullRequest.comments).selectinload(PRComment.author),
            selectinload(PullRequest.reviews).selectinload(PRReview.reviewer),
        )
        .where(PullRequest.id == pr_id)
    )
    pr = result.scalar_one_or_none()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    
    pr_dict = {
        "id": pr.id,
        "repository_id": pr.repository_id,
        "issue_id": pr.issue_id,
        "number": pr.number,
        "title": pr.title,
        "description": pr.description,
        "status": pr.status,
        "source_branch": pr.source_branch,
        "target_branch": pr.target_branch,
        "author_id": pr.author_id,
        "author": pr.author,
        "created_at": pr.created_at,
        "merged_at": pr.merged_at,
        "merged_by": pr.merged_by,
        "reviews": pr.reviews,
    }

    # Threading logic
    comments_by_id = {}
    for comment in pr.comments:
        c_dict = {
            "id": comment.id,
            "pull_request_id": comment.pull_request_id,
            "parent_comment_id": comment.parent_comment_id,
            "author": comment.author,
            "content": comment.content,
            "created_at": comment.created_at,
            "replies": []
        }
        comments_by_id[comment.id] = c_dict

    root_comments = []
    for comment in pr.comments:
        c_dict = comments_by_id[comment.id]
        if comment.parent_comment_id:
            parent_dict = comments_by_id.get(comment.parent_comment_id)
            if parent_dict:
                parent_dict["replies"].append(c_dict)
            else:
                root_comments.append(c_dict)
        else:
            root_comments.append(c_dict)
            
    root_comments.sort(key=lambda x: x["created_at"])
    for c in comments_by_id.values():
        c["replies"].sort(key=lambda x: x["created_at"])
        
    pr_dict["comments"] = root_comments
    return pr_dict


async def submit_review(
    db: AsyncSession,
    user: User,
    pr_id: uuid.UUID,
    data: PRReviewCreate,
) -> PRReview:
    pr_repo = PullRequestRepository(db)
    pr = await pr_repo.get(pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
        
    repo_repo = RepositoryRepository(db)
    repo = await repo_repo.get(pr.repository_id)
    await _require_org_member(db, user.id, repo.organization_id, min_role="developer")
    
    review_repo = PRReviewRepository(db)
    review = await review_repo.create({
        "pull_request_id": pr_id,
        "reviewer_id": user.id,
        "status": data.status,
        "comment": data.comment,
    })
    
    await db.refresh(review, ["reviewer"])
    return review


async def merge_pull_request(
    db: AsyncSession,
    user: User,
    pr_id: uuid.UUID,
) -> dict:
    pr_repo = PullRequestRepository(db)
    pr = await pr_repo.get(pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
        
    if pr.status in ("merged", "closed"):
        raise HTTPException(status_code=409, detail="Pull request is already merged or closed")
        
    repo_repo = RepositoryRepository(db)
    repo = await repo_repo.get(pr.repository_id)
    await _require_org_member(db, user.id, repo.organization_id, min_role="maintainer")
    
    now = datetime.utcnow()
    pr = await pr_repo.update(pr, {
        "status": "merged",
        "merged_at": now,
        "merged_by": user.id
    })
    
    return {
        "status": "merged",
        "merged_at": now,
        "merged_by": user.id
    }


async def create_comment(
    db: AsyncSession,
    user: User,
    pr_id: uuid.UUID,
    data: PRCommentCreate,
) -> PRComment:
    pr_repo = PullRequestRepository(db)
    pr = await pr_repo.get(pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
        
    repo_repo = RepositoryRepository(db)
    repo = await repo_repo.get(pr.repository_id)
    await _require_org_member(db, user.id, repo.organization_id, min_role="developer")
    
    comment_repo = PRCommentRepository(db)
    
    if data.parent_comment_id:
        parent = await comment_repo.get(data.parent_comment_id)
        if not parent or parent.pull_request_id != pr_id:
            raise HTTPException(status_code=400, detail="Parent comment invalid or from another PR")
            
    comment = await comment_repo.create({
        "pull_request_id": pr_id,
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
    comment_repo = PRCommentRepository(db)
    comment = await comment_repo.get(comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    pr_repo = PullRequestRepository(db)
    pr = await pr_repo.get(comment.pull_request_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
        
    if comment.author_id != user.id and pr.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
        
    await comment_repo.delete(comment)
