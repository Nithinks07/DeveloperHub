"""Pydantic v2 schemas for Tasks.

Covers all request/response shapes defined in the API contract for Lane C.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

TaskStatus = Literal["backlog", "todo", "in_progress", "review", "testing", "completed"]
TaskPriority = Literal["low", "medium", "high", "critical"]

TASK_STATUSES: list[str] = ["backlog", "todo", "in_progress", "review", "testing", "completed"]


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class TaskCreate(BaseModel):
    """Payload for POST /projects/{id}/tasks."""

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    priority: TaskPriority = "medium"
    assigned_to: uuid.UUID | None = None


class TaskPatch(BaseModel):
    """Payload for PATCH /tasks/{id}.

    All fields optional — used for drag-drop reorder, status change, reassign.
    """

    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assigned_to: uuid.UUID | None = None
    order: int | None = Field(None, ge=0, description="0-indexed position within the column.")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class TaskResponse(BaseModel):
    """Single task object returned by all task endpoints."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None = None
    status: str
    priority: str
    assigned_to: uuid.UUID | None = None
    order: int
    created_by: uuid.UUID
    created_at: datetime
