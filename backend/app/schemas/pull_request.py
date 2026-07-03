from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserResponse

PRStatus = Literal["open", "merged", "closed"]
ReviewStatus = Literal["pending", "approved", "changes_requested", "commented"]


class PullRequestCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    source_branch: str = Field(..., max_length=255)
    target_branch: str = Field(..., max_length=255)
    issue_id: Optional[UUID] = None


class PRCommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[UUID] = None


class PRReviewCreate(BaseModel):
    status: ReviewStatus
    comment: Optional[str] = None


class PRCommentResponse(BaseModel):
    id: UUID
    pull_request_id: UUID
    parent_comment_id: Optional[UUID]
    author: UserResponse
    content: str
    replies: List["PRCommentResponse"] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PRReviewResponse(BaseModel):
    id: UUID
    reviewer: UserResponse
    status: ReviewStatus
    comment: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PullRequestResponse(BaseModel):
    id: UUID
    repository_id: UUID
    issue_id: Optional[UUID]
    number: int
    title: str
    description: Optional[str]
    status: PRStatus
    source_branch: str
    target_branch: str
    author_id: UUID
    created_at: datetime
    merged_at: Optional[datetime]
    merged_by: Optional[UUID]

    model_config = ConfigDict(from_attributes=True)


class PullRequestDetailResponse(PullRequestResponse):
    author: UserResponse
    comments: List[PRCommentResponse] = []
    reviews: List[PRReviewResponse] = []


class PullRequestListResponse(BaseModel):
    items: List[PullRequestResponse]
    total: int
    page: int
    page_size: int
