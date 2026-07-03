"""Tasks API router — Lane C.

Endpoints:
  PATCH  /tasks/{task_id}   — update task (drag-drop status/order change, reassign)
  DELETE /tasks/{task_id}   — delete task
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.task import TaskPatch, TaskResponse
from app.services import project_service

router = APIRouter(tags=["tasks"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


@router.patch(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Update task (drag-drop, reorder, reassign — developer+ role required)",
)
async def patch_task(
    task_id: uuid.UUID,
    payload: TaskPatch,
    current_user: CurrentUser,
    db: DB,
) -> TaskResponse:
    """Update task fields and/or Kanban position.

    Providing `status` and/or `order` triggers the reorder algorithm which
    guarantees no duplicate or gap order values within any column.
    """
    return await project_service.patch_task(db, task_id, payload, current_user)


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task (developer+ role required)",
)
async def delete_task(
    task_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
) -> None:
    await project_service.delete_task(db, task_id, current_user)
