"""Project service layer — Lane C.

Business logic for Projects, Tasks, Labels, and Milestones.

Permission matrix:
  Project create:     developer+ in repo's org
  Project update/delete: creator OR maintainer+ in repo's org
  Task create/update/delete: developer+ in repo's org (any member who can work in the project)

Drag-drop reorder contract (PATCH /tasks/{id}):
  - Moving within the same column: shift neighbours to close the gap, insert at
    the requested position, then compact the column to [0, 1, 2, ...] so no
    gaps or duplicates exist.
  - Moving to a different column: remove from source column (compact remaining
    tasks), insert into destination column at the requested position (compact
    destination too).
  Both paths call `_compact_column` which guarantees contiguous 0-based order
  values — no duplicates, no gaps.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.label import LabelRepository
from app.repositories.milestone import MilestoneRepository
from app.repositories.project import ProjectRepository
from app.repositories.repository import RepositoryRepository
from app.repositories.task import TaskRepository
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
from app.schemas.task import (
    TASK_STATUSES,
    TaskCreate,
    TaskPatch,
    TaskResponse,
)
from app.services.repository_service import _require_org_member  # reuse from Lane B

_DEVELOPER_PLUS = {"developer", "maintainer", "admin", "owner"}
_MAINTAINER_PLUS = {"maintainer", "admin", "owner"}


# ---------------------------------------------------------------------------
# Internal converters
# ---------------------------------------------------------------------------

def _project_to_response(p) -> ProjectResponse:
    return ProjectResponse.model_validate(p)


def _task_to_response(t) -> TaskResponse:
    return TaskResponse.model_validate(t)


def _label_to_response(lb) -> LabelResponse:
    return LabelResponse.model_validate(lb)


def _milestone_to_response(ms) -> MilestoneResponse:
    return MilestoneResponse.model_validate(ms)


async def _resolve_repo_org(db: AsyncSession, repo_id: uuid.UUID) -> uuid.UUID:
    """Return the org_id for a repository, raising 404 if not found."""
    repo_repo = RepositoryRepository(db)
    repo = await repo_repo.get_by_id(repo_id)
    if repo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")
    return repo.organization_id


async def _resolve_project_org(db: AsyncSession, project_id: uuid.UUID):
    """Return the (project, org_id) for a project, raising 404 if not found."""
    proj_repo = ProjectRepository(db)
    project = await proj_repo.get_by_id(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    org_id = await _resolve_repo_org(db, project.repository_id)
    return project, org_id


# ---------------------------------------------------------------------------
# Kanban reorder helpers
# ---------------------------------------------------------------------------

async def _compact_column(
    task_repo: TaskRepository,
    project_id: uuid.UUID,
    status: str,
    exclude_task_id: uuid.UUID | None = None,
) -> list:
    """Return a list of tasks in a column, already sorted by current order.

    This is a read-only helper — it returns the tasks so the caller can
    calculate new order values.  The actual DB update is done by the caller
    via bulk_update_order.
    """
    return await task_repo.get_tasks_in_column_ordered(
        project_id, status, exclude_task_id=exclude_task_id
    )


async def _reorder_task(
    db: AsyncSession,
    task_repo: TaskRepository,
    task,
    new_status: str,
    new_order: int,
) -> None:
    """Core reorder algorithm.

    Algorithm:
    1. Remove the task from its current column by compacting that column's
       remaining tasks into 0-based positions.  Write those positions.
    2. Read the destination column tasks (excluding the moving task).
       Clamp new_order to [0, len(dest_tasks)].
       Insert the task at new_order by shifting tasks at >= new_order up by 1.
       Write the destination column positions and the task's new position.

    This guarantees:
    - No duplicate order values within a column.
    - No gaps in order values within a column.
    - Idempotent: same-column same-position move is a no-op for neighbours.
    """
    old_status = task.status
    old_order = task.order
    project_id = task.project_id

    if old_status == new_status:
        # Same column reorder
        # 1. Gather all tasks in column except the moving one
        others = await _compact_column(task_repo, project_id, old_status, exclude_task_id=task.id)
        # 2. Clamp target position
        target = max(0, min(new_order, len(others)))
        # 3. Insert the task id into the position list
        ids_ordered = [t.id for t in others]
        ids_ordered.insert(target, task.id)
        # 4. Write 0-based order values
        updates = [(tid, idx) for idx, tid in enumerate(ids_ordered)]
        await task_repo.bulk_update_order(updates)
        # Update the in-memory task object for the response
        task.order = target
    else:
        # Cross-column move
        # 1. Compact source column (the task is leaving)
        source_others = await _compact_column(task_repo, project_id, old_status, exclude_task_id=task.id)
        source_updates = [(t.id, idx) for idx, t in enumerate(source_others)]
        await task_repo.bulk_update_order(source_updates)

        # 2. Compact destination column (task is arriving)
        dest_others = await _compact_column(task_repo, project_id, new_status, exclude_task_id=task.id)
        target = max(0, min(new_order, len(dest_others)))
        dest_ids = [t.id for t in dest_others]
        dest_ids.insert(target, task.id)
        dest_updates = [(tid, idx) for idx, tid in enumerate(dest_ids)]
        await task_repo.bulk_update_order(dest_updates)

        # Update in-memory
        task.status = new_status
        task.order = target


# ---------------------------------------------------------------------------
# Project CRUD
# ---------------------------------------------------------------------------

async def create_project(
    db: AsyncSession,
    repo_id: uuid.UUID,
    payload: ProjectCreate,
    current_user: User,
) -> ProjectResponse:
    """Create a project in a repository. Requires developer+ role.

    Raises:
        HTTPException 404: Repository not found.
        HTTPException 403: User lacks developer+ role.
    """
    org_id = await _resolve_repo_org(db, repo_id)
    await _require_org_member(db, org_id, current_user.id, _DEVELOPER_PLUS, "create projects")

    proj_repo = ProjectRepository(db)
    project = await proj_repo.create({
        "repository_id": repo_id,
        "name": payload.name,
        "description": payload.description,
        "status": "active",
        "created_by": current_user.id,
    })
    return _project_to_response(project)


async def list_projects(
    db: AsyncSession,
    repo_id: uuid.UUID,
    current_user: User,
    page: int,
    page_size: int,
) -> ProjectListResponse:
    """List projects in a repository (any org member).

    Raises:
        HTTPException 404: Repository not found.
        HTTPException 403: User is not a member.
    """
    org_id = await _resolve_repo_org(db, repo_id)
    # Any membership — guest+ — suffices; _require_org_member with full set handles the 403
    await _require_org_member(
        db, org_id, current_user.id,
        {"guest", "developer", "maintainer", "admin", "owner"},
        "list projects",
    )
    proj_repo = ProjectRepository(db)
    skip = (page - 1) * page_size
    projects = await proj_repo.list_by_repository(repo_id, skip=skip, limit=page_size)
    total = await proj_repo.count_by_repository(repo_id)
    return ProjectListResponse(
        items=[_project_to_response(p) for p in projects],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_project_detail(
    db: AsyncSession,
    project_id: uuid.UUID,
    current_user: User,
) -> ProjectDetailResponse:
    """Return a project with tasks_by_status, labels, and milestones.

    Raises:
        HTTPException 404: Project not found.
        HTTPException 403: User is not a member.
    """
    proj_repo = ProjectRepository(db)
    project = await proj_repo.get_with_relations(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    org_id = await _resolve_repo_org(db, project.repository_id)
    await _require_org_member(
        db, org_id, current_user.id,
        {"guest", "developer", "maintainer", "admin", "owner"},
        "view this project",
    )

    # Build tasks_by_status grouped dict (guaranteed all 6 columns present)
    tasks_by_status: dict[str, list[TaskResponse]] = {s: [] for s in TASK_STATUSES}
    for task in sorted(project.tasks, key=lambda t: t.order):
        if task.status in tasks_by_status:
            tasks_by_status[task.status].append(_task_to_response(task))

    return ProjectDetailResponse(
        id=project.id,
        repository_id=project.repository_id,
        name=project.name,
        description=project.description,
        status=project.status,
        created_by=project.created_by,
        created_at=project.created_at,
        tasks_by_status=tasks_by_status,
        labels=[_label_to_response(lb) for lb in project.labels],
        milestones=[_milestone_to_response(ms) for ms in project.milestones],
    )


async def update_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    current_user: User,
) -> ProjectResponse:
    """Update a project. Requires creator OR maintainer+ role.

    Raises:
        HTTPException 404: Project not found.
        HTTPException 403: User lacks permission.
    """
    project, org_id = await _resolve_project_org(db, project_id)

    from app.services.organization_service import get_user_org_role  # noqa
    role = await get_user_org_role(db, org_id, current_user.id)
    is_creator = project.created_by == current_user.id
    is_maintainer_plus = role in _MAINTAINER_PLUS

    if not (is_creator or is_maintainer_plus):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project creator or a maintainer+ can update this project.",
        )

    proj_repo = ProjectRepository(db)
    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        project = await proj_repo.update(project, update_data)
    return _project_to_response(project)


async def delete_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    current_user: User,
) -> None:
    """Delete a project. Requires creator OR maintainer+ role.

    Raises:
        HTTPException 404: Project not found.
        HTTPException 403: User lacks permission.
    """
    project, org_id = await _resolve_project_org(db, project_id)

    from app.services.organization_service import get_user_org_role  # noqa
    role = await get_user_org_role(db, org_id, current_user.id)
    is_creator = project.created_by == current_user.id
    is_maintainer_plus = role in _MAINTAINER_PLUS

    if not (is_creator or is_maintainer_plus):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project creator or a maintainer+ can delete this project.",
        )

    proj_repo = ProjectRepository(db)
    await proj_repo.delete(project)


# ---------------------------------------------------------------------------
# Task CRUD
# ---------------------------------------------------------------------------

async def create_task(
    db: AsyncSession,
    project_id: uuid.UUID,
    payload: TaskCreate,
    current_user: User,
) -> TaskResponse:
    """Create a task in a project. Requires developer+ role.

    Tasks start at 'backlog' status with order = (max_order_in_backlog + 1).

    Raises:
        HTTPException 404: Project not found.
        HTTPException 403: User lacks developer+ role.
    """
    project, org_id = await _resolve_project_org(db, project_id)
    await _require_org_member(db, org_id, current_user.id, _DEVELOPER_PLUS, "create tasks")

    task_repo = TaskRepository(db)
    max_order = await task_repo.get_max_order_in_column(project_id, "backlog")
    new_order = max_order + 1

    task = await task_repo.create({
        "project_id": project_id,
        "title": payload.title,
        "description": payload.description,
        "status": "backlog",
        "priority": payload.priority,
        "assigned_to": payload.assigned_to,
        "order": new_order,
        "created_by": current_user.id,
    })
    return _task_to_response(task)


async def patch_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    payload: TaskPatch,
    current_user: User,
) -> TaskResponse:
    """Update a task (drag-drop, reorder, reassign). Requires developer+ role.

    The `order` and `status` fields together drive the Kanban reorder:
    - If only status changes: task appended to end of destination column.
    - If order is provided: task inserted at that position (0-indexed).

    The reorder algorithm in _reorder_task guarantees no duplicate or gap
    order values in any column after the operation.

    Raises:
        HTTPException 404: Task not found.
        HTTPException 403: User lacks developer+ role.
    """
    task_repo = TaskRepository(db)
    task = await task_repo.get_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    # Resolve project → repo → org for permission check
    project, org_id = await _resolve_project_org(db, task.project_id)
    await _require_org_member(db, org_id, current_user.id, _DEVELOPER_PLUS, "update tasks")

    update_data = payload.model_dump(exclude_unset=True)

    # Extract position-related fields before calling generic update
    new_status = update_data.pop("status", None)
    new_order = update_data.pop("order", None)

    # Apply non-position fields (title, description, priority, assigned_to)
    if update_data:
        task = await task_repo.update(task, update_data)

    # Handle position change
    target_status = new_status if new_status is not None else task.status
    if new_status is not None or new_order is not None:
        target_order = new_order if new_order is not None else (
            await task_repo.get_max_order_in_column(
                task.project_id, target_status, exclude_task_id=task.id
            ) + 1
        )
        await _reorder_task(db, task_repo, task, target_status, target_order)

    return _task_to_response(task)


async def delete_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    current_user: User,
) -> None:
    """Delete a task. Requires developer+ role.

    After deletion, compacts the source column to remove the gap.

    Raises:
        HTTPException 404: Task not found.
        HTTPException 403: User lacks developer+ role.
    """
    task_repo = TaskRepository(db)
    task = await task_repo.get_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    project, org_id = await _resolve_project_org(db, task.project_id)
    await _require_org_member(db, org_id, current_user.id, _DEVELOPER_PLUS, "delete tasks")

    project_id = task.project_id
    col_status = task.status

    await task_repo.delete(task)

    # Compact the column order values after deletion
    remaining = await task_repo.get_tasks_in_column_ordered(project_id, col_status)
    updates = [(t.id, idx) for idx, t in enumerate(remaining)]
    if updates:
        await task_repo.bulk_update_order(updates)


# ---------------------------------------------------------------------------
# Label CRUD
# ---------------------------------------------------------------------------

async def create_label(
    db: AsyncSession,
    project_id: uuid.UUID,
    payload: LabelCreate,
    current_user: User,
) -> LabelResponse:
    """Create a label in a project. Requires developer+ role.

    Raises:
        HTTPException 404: Project not found.
        HTTPException 403: User lacks developer+ role.
        HTTPException 409: Label name already exists in this project.
    """
    project, org_id = await _resolve_project_org(db, project_id)
    await _require_org_member(db, org_id, current_user.id, _DEVELOPER_PLUS, "create labels")

    label_repo = LabelRepository(db)
    if await label_repo.get_by_name_in_project(project_id, payload.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A label named '{payload.name}' already exists in this project.",
        )

    try:
        label = await label_repo.create({
            "project_id": project_id,
            "name": payload.name,
            "color": payload.color,
        })
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A label named '{payload.name}' already exists in this project.",
        )

    return _label_to_response(label)


# ---------------------------------------------------------------------------
# Milestone CRUD
# ---------------------------------------------------------------------------

async def create_milestone(
    db: AsyncSession,
    project_id: uuid.UUID,
    payload: MilestoneCreate,
    current_user: User,
) -> MilestoneResponse:
    """Create a milestone in a project. Requires developer+ role.

    Raises:
        HTTPException 404: Project not found.
        HTTPException 403: User lacks developer+ role.
    """
    project, org_id = await _resolve_project_org(db, project_id)
    await _require_org_member(db, org_id, current_user.id, _DEVELOPER_PLUS, "create milestones")

    ms_repo = MilestoneRepository(db)
    milestone = await ms_repo.create({
        "project_id": project_id,
        "name": payload.name,
        "description": payload.description,
        "due_date": payload.due_date,
        "status": "open",
    })
    return _milestone_to_response(milestone)
