"""Projects API router — Lane C.

Endpoints:
  POST   /repositories/{repository_id}/projects          — create project
  GET    /repositories/{repository_id}/projects          — list projects (paginated)
  GET    /projects/{project_id}                          — get project + kanban tasks
  PUT    /projects/{project_id}                          — update project
  DELETE /projects/{project_id}                          — delete project
  POST   /projects/{project_id}/tasks                    — create task
  POST   /projects/{project_id}/labels                   — create label
  POST   /projects/{project_id}/milestones               — create milestone
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.project import (
    LabelCreate,
    LabelResponse,
    MilestoneCreate,
    MilestoneResponse,
    ProjectCreate,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.schemas.task import TaskCreate, TaskResponse
from app.services import project_service

router = APIRouter(tags=["projects"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Repository-scoped project endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/repositories/{repository_id}/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project in a repository (developer+ role required)",
)
async def create_project(
    repository_id: uuid.UUID,
    payload: ProjectCreate,
    current_user: CurrentUser,
    db: DB,
) -> ProjectResponse:
    return await project_service.create_project(db, repository_id, payload, current_user)


@router.get(
    "/repositories/{repository_id}/projects",
    response_model=ProjectListResponse,
    summary="List projects in a repository",
)
async def list_projects(
    repository_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> ProjectListResponse:
    return await project_service.list_projects(
        db, repository_id, current_user, page=page, page_size=page_size
    )


# ---------------------------------------------------------------------------
# Project-scoped endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}",
    response_model=ProjectDetailResponse,
    summary="Get project with all tasks grouped by Kanban column",
)
async def get_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
) -> ProjectDetailResponse:
    return await project_service.get_project_detail(db, project_id, current_user)


@router.put(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    summary="Update a project (creator or maintainer+ role required)",
)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    current_user: CurrentUser,
    db: DB,
) -> ProjectResponse:
    return await project_service.update_project(db, project_id, payload, current_user)


@router.delete(
    "/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project (creator or maintainer+ role required)",
)
async def delete_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
) -> None:
    await project_service.delete_project(db, project_id, current_user)


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a task in a project",
)
async def create_task(
    project_id: uuid.UUID,
    payload: TaskCreate,
    current_user: CurrentUser,
    db: DB,
) -> TaskResponse:
    return await project_service.create_task(db, project_id, payload, current_user)


@router.post(
    "/projects/{project_id}/labels",
    response_model=LabelResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a label in a project",
)
async def create_label(
    project_id: uuid.UUID,
    payload: LabelCreate,
    current_user: CurrentUser,
    db: DB,
) -> LabelResponse:
    return await project_service.create_label(db, project_id, payload, current_user)


@router.post(
    "/projects/{project_id}/milestones",
    response_model=MilestoneResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a milestone in a project",
)
async def create_milestone(
    project_id: uuid.UUID,
    payload: MilestoneCreate,
    current_user: CurrentUser,
    db: DB,
) -> MilestoneResponse:
    return await project_service.create_milestone(db, project_id, payload, current_user)
