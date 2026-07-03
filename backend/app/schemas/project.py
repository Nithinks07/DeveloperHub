"""Pydantic v2 schemas for Projects, Labels, and Milestones.

Covers all request/response shapes defined in the API contract for Lane C.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums (as Literal types — consistent with existing auth/org schemas)
# ---------------------------------------------------------------------------

ProjectStatus = Literal["active", "archived"]
MilestoneStatus = Literal["open", "closed"]


# ---------------------------------------------------------------------------
# Label schemas
# ---------------------------------------------------------------------------


class LabelCreate(BaseModel):
    """Payload for POST /projects/{id}/labels."""

    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field("#808080", pattern=r"^#[0-9a-fA-F]{6}$", description="Hex colour, e.g. #ff0000")


class LabelResponse(BaseModel):
    """Single label object."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    color: str


# ---------------------------------------------------------------------------
# Milestone schemas
# ---------------------------------------------------------------------------


class MilestoneCreate(BaseModel):
    """Payload for POST /projects/{id}/milestones."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    due_date: datetime | None = None


class MilestoneResponse(BaseModel):
    """Single milestone object."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None = None
    due_date: datetime | None = None
    status: str


# ---------------------------------------------------------------------------
# Task schemas (imported from task.py — forward-declared here for the
# tasks_by_status field used in ProjectDetailResponse)
# ---------------------------------------------------------------------------

# Imported inline below to avoid circular imports.


# ---------------------------------------------------------------------------
# Project request schemas
# ---------------------------------------------------------------------------


class ProjectCreate(BaseModel):
    """Payload for POST /repositories/{id}/projects."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class ProjectUpdate(BaseModel):
    """Payload for PUT /projects/{id}. All fields optional."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: ProjectStatus | None = None


# ---------------------------------------------------------------------------
# Project response schemas
# ---------------------------------------------------------------------------


class ProjectResponse(BaseModel):
    """Flat project object (no tasks) — used in list responses."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    repository_id: uuid.UUID
    name: str
    description: str | None = None
    status: str
    created_by: uuid.UUID
    created_at: datetime


class ProjectListResponse(BaseModel):
    """Paginated wrapper for GET /repositories/{id}/projects."""

    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int


class ProjectDetailResponse(ProjectResponse):
    """Full project with grouped tasks, labels, and milestones.

    Used by GET /projects/{id}.
    """

    # Imported inline from task.py to avoid circular imports at module level.
    # The actual type is dict[str, list[TaskResponse]] — populated at runtime.
    tasks_by_status: dict[str, list] = Field(default_factory=dict)
    labels: list[LabelResponse] = []
    milestones: list[MilestoneResponse] = []
