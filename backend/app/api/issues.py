import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueResponse,
    IssueListResponse,
    IssueDetailResponse,
    IssueCommentCreate,
    IssueCommentResponse,
    IssueLabelAdd,
)
from app.services import issue_service

router = APIRouter(tags=["issues"])


@router.post(
    "/repositories/{repository_id}/issues",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_issue(
    repository_id: uuid.UUID,
    data: IssueCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await issue_service.create_issue(db, current_user, repository_id, data)


@router.get("/repositories/{repository_id}/issues", response_model=IssueListResponse)
async def list_issues(
    repository_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await issue_service.list_issues(db, repository_id, page, page_size)
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/issues/{issue_id}", response_model=IssueDetailResponse)
async def get_issue(
    issue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await issue_service.get_issue_threaded(db, issue_id)


@router.patch("/issues/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: uuid.UUID,
    data: IssueUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await issue_service.update_issue(db, current_user, issue_id, data)


@router.delete("/issues/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(
    issue_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await issue_service.delete_issue(db, current_user, issue_id)


@router.post("/issues/{issue_id}/labels", response_model=IssueDetailResponse)
async def add_label(
    issue_id: uuid.UUID,
    data: IssueLabelAdd,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await issue_service.add_label(db, current_user, issue_id, data.label_id)


@router.delete("/issues/{issue_id}/labels/{label_id}", response_model=IssueDetailResponse)
async def remove_label(
    issue_id: uuid.UUID,
    label_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await issue_service.remove_label(db, current_user, issue_id, label_id)


@router.post(
    "/issues/{issue_id}/comments",
    response_model=IssueCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    issue_id: uuid.UUID,
    data: IssueCommentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    comment = await issue_service.create_comment(db, current_user, issue_id, data)
    return {
        "id": comment.id,
        "issue_id": comment.issue_id,
        "parent_comment_id": comment.parent_comment_id,
        "author": comment.author,
        "content": comment.content,
        "replies": [],
        "created_at": comment.created_at,
    }


@router.delete("/issue_comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await issue_service.delete_comment(db, current_user, comment_id)
