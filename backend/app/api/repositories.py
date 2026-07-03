"""Repositories API router.

Endpoints (5 total — matching the API contract exactly):

  POST   /organizations/{organization_id}/repositories  — create repo in org
  GET    /organizations/{organization_id}/repositories  — list repos in org (paginated)
  GET    /repositories/{repository_id}                  — get repo details
  PUT    /repositories/{repository_id}                  — update repo (developer+)
  DELETE /repositories/{repository_id}                  — delete repo (maintainer+)
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.repository import (
    RepositoryCreate,
    RepositoryListResponse,
    RepositoryResponse,
    RepositoryUpdate,
)
from app.services import repository_service

router = APIRouter(tags=["repositories"])

# ---------------------------------------------------------------------------
# Type aliases for injected dependencies
# ---------------------------------------------------------------------------

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Org-scoped endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/organizations/{organization_id}/repositories",
    response_model=RepositoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a repository in an organization (developer+ role required)",
)
async def create_repository(
    organization_id: uuid.UUID,
    payload: RepositoryCreate,
    current_user: CurrentUser,
    db: DB,
) -> RepositoryResponse:
    """Create a new repository inside the specified organization.

    Requires developer+ role in the organization.
    Returns 409 if a repository with the same name already exists in the org.
    """
    return await repository_service.create_repository(
        db, organization_id, payload, current_user
    )


@router.get(
    "/organizations/{organization_id}/repositories",
    response_model=RepositoryListResponse,
    summary="List repositories in an organization (any member)",
)
async def list_repositories(
    organization_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)."),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page (max 100)."),
) -> RepositoryListResponse:
    """Return a paginated list of repositories in the specified organization.

    Accessible to any org member (guest and above).
    """
    return await repository_service.list_repositories(
        db, organization_id, current_user, page=page, page_size=page_size
    )


# ---------------------------------------------------------------------------
# Repo-scoped endpoints (no org_id in path — repo carries org_id internally)
# ---------------------------------------------------------------------------


@router.get(
    "/repositories/{repository_id}",
    response_model=RepositoryResponse,
    summary="Get repository details",
)
async def get_repository(
    repository_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
) -> RepositoryResponse:
    """Return full details of a single repository.

    Accessible to any org member (guest and above).
    """
    return await repository_service.get_repository(db, repository_id, current_user)


@router.put(
    "/repositories/{repository_id}",
    response_model=RepositoryResponse,
    summary="Update a repository (developer+ role required)",
)
async def update_repository(
    repository_id: uuid.UUID,
    payload: RepositoryUpdate,
    current_user: CurrentUser,
    db: DB,
) -> RepositoryResponse:
    """Update a repository's name, description, visibility, or readme.

    Requires developer+ role in the repository's organization.
    Returns 409 if a rename would conflict with another repo in the same org.
    """
    return await repository_service.update_repository(
        db, repository_id, payload, current_user
    )


@router.delete(
    "/repositories/{repository_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a repository (maintainer+ role required)",
)
async def delete_repository(
    repository_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
) -> None:
    """Hard-delete a repository.

    All projects, tasks, issues, and PRs are removed via ON DELETE CASCADE.
    Requires maintainer+ role in the repository's organization.
    """
    await repository_service.delete_repository(db, repository_id, current_user)
