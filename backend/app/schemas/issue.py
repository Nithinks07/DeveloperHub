from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.project import LabelResponse
from app.schemas.auth import UserResponse

IssueType = Literal["bug", "feature", "task", "enhancement", "research", "documentation"]
IssuePriority = Literal["low", "medium", "high", "critical"]
IssueStatus = Literal["open", "closed"]


class IssueCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    type: IssueType
    priority: IssuePriority = "medium"
    assigned_to: Optional[UUID] = None
    milestone_id: Optional[UUID] = None
    task_id: Optional[UUID] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    status: Optional[IssueStatus] = None
    type: Optional[IssueType] = None
    priority: Optional[IssuePriority] = None
    assigned_to: Optional[UUID] = None
    milestone_id: Optional[UUID] = None
    task_id: Optional[UUID] = None


class IssueCommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[UUID] = None


class IssueLabelAdd(BaseModel):
    label_id: UUID


class IssueCommentResponse(BaseModel):
    id: UUID
    issue_id: UUID
    parent_comment_id: Optional[UUID]
    author: UserResponse
    content: str
    replies: List["IssueCommentResponse"] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IssueResponse(BaseModel):
    id: UUID
    repository_id: UUID
    task_id: Optional[UUID]
    number: int
    title: str
    description: Optional[str]
    status: IssueStatus
    type: IssueType
    priority: IssuePriority
    assigned_to: Optional[UUID]
    milestone_id: Optional[UUID]
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IssueDetailResponse(IssueResponse):
    labels: List[LabelResponse] = []
    comments: List[IssueCommentResponse] = []


class IssueListResponse(BaseModel):
    items: List[IssueResponse]
    total: int
    page: int
    page_size: int
