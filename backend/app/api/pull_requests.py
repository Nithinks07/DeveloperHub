import uuid
from typing import Dict, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.pull_request import (
    PullRequestCreate,
    PullRequestResponse,
    PullRequestListResponse,
    PullRequestDetailResponse,
    PRCommentCreate,
    PRCommentResponse,
    PRReviewCreate,
    PRReviewResponse,
)
from app.services import pull_request_service

router = APIRouter(tags=["pull_requests"])


@router.post(
    "/repositories/{repository_id}/pull_requests",
    response_model=PullRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_pull_request(
    repository_id: uuid.UUID,
    data: PullRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await pull_request_service.create_pull_request(db, current_user, repository_id, data)


@router.get("/repositories/{repository_id}/pull_requests", response_model=PullRequestListResponse)
async def list_pull_requests(
    repository_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await pull_request_service.list_pull_requests(db, repository_id, page, page_size)
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/pull_requests/{pr_id}", response_model=PullRequestDetailResponse)
async def get_pull_request(
    pr_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await pull_request_service.get_pull_request_threaded(db, pr_id)


@router.post(
    "/pull_requests/{pr_id}/reviews",
    response_model=PRReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_review(
    pr_id: uuid.UUID,
    data: PRReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await pull_request_service.submit_review(db, current_user, pr_id, data)


@router.post("/pull_requests/{pr_id}/merge", response_model=Dict[str, Any])
async def merge_pull_request(
    pr_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await pull_request_service.merge_pull_request(db, current_user, pr_id)


@router.post(
    "/pull_requests/{pr_id}/comments",
    response_model=PRCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    pr_id: uuid.UUID,
    data: PRCommentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    comment = await pull_request_service.create_comment(db, current_user, pr_id, data)
    return {
        "id": comment.id,
        "pull_request_id": comment.pull_request_id,
        "parent_comment_id": comment.parent_comment_id,
        "author": comment.author,
        "content": comment.content,
        "replies": [],
        "created_at": comment.created_at,
    }


@router.delete("/pr_comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await pull_request_service.delete_comment(db, current_user, comment_id)
