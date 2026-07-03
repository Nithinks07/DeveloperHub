"""Repository service layer.

Contains all business logic for repositories:
  - Org existence check (404)
  - Permission checks via get_user_org_role (403)
  - Name uniqueness within org (409)
  - Paginated listing

Permission matrix (inherits from org role):
  Create:  developer+ (developer, maintainer, admin, owner)
  Update:  developer+ (developer, maintainer, admin, owner)
  Delete:  maintainer+ (maintainer, admin, owner)
  Read:    any org member (including guest)

Routes should only call this service; they must never touch the DB directly.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.organization import OrganizationRepository
from app.repositories.repository import RepositoryRepository
from app.schemas.repository import (
    RepositoryCreate,
    RepositoryListResponse,
    RepositoryResponse,
    RepositoryUpdate,
)

# TODO (Lane A integration): get_user_org_role is defined in
# app/services/organization_service.py (Lane A). This import works once
# Lane A merges into the same branch. All call-sites are marked below.
from app.services.organization_service import get_user_org_role  # noqa: E402  (Lane A dependency)

# ---------------------------------------------------------------------------
# Role-ordering helpers
# ---------------------------------------------------------------------------

_ROLE_ORDER: dict[str, int] = {
    "guest": 0,
    "developer": 1,
    "maintainer": 2,
    "admin": 3,
    "owner": 4,
}

_DEVELOPER_PLUS = {"developer", "maintainer", "admin", "owner"}
_MAINTAINER_PLUS = {"maintainer", "admin", "owner"}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _repo_to_response(repo) -> RepositoryResponse:
    """Convert a Repository ORM instance to RepositoryResponse."""
    return RepositoryResponse.model_validate(repo)


async def _require_org_member(
    db: AsyncSession,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    allowed_roles: set[str],
    action: str,
) -> str:
    """Assert the user has a sufficient role in the org.

    # TODO (Lane A): Calls get_user_org_role from organization_service.py.
    # Remove this comment once Lane A is merged and the integration is verified.

    Args:
        db:            Async database session.
        org_id:        Target organization UUID.
        user_id:       Current user UUID.
        allowed_roles: Set of roles that are permitted.
        action:        Human-readable action name for the error message.

    Returns:
        The user's role string.

    Raises:
        HTTPException 403: User is not a member or lacks the required role.
    """
    # TODO (Lane A): get_user_org_role call — depends on Lane A merging.
    role = await get_user_org_role(db, org_id, user_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization.",
        )
    if role not in allowed_roles:
        min_role = min(
            (r for r in allowed_roles if r in _ROLE_ORDER),
            key=lambda r: _ROLE_ORDER[r],
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You need at least the '{min_role}' role to {action}.",
        )
    return role


# ---------------------------------------------------------------------------
# Repository CRUD
# ---------------------------------------------------------------------------

async def create_repository(
    db: AsyncSession,
    org_id: uuid.UUID,
    payload: RepositoryCreate,
    current_user: User,
) -> RepositoryResponse:
    """Create a repository inside an organization.

    Requires developer+ role in the organization.

    Raises:
        HTTPException 404: Organization not found.
        HTTPException 403: User lacks developer+ role.
        HTTPException 409: A repo with the same name already exists in the org.
    """
    org_repo = OrganizationRepository(db)
    repo_repo = RepositoryRepository(db)

    # Verify org exists
    org = await org_repo.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    # Permission check — TODO (Lane A): uses get_user_org_role
    await _require_org_member(db, org_id, current_user.id, _DEVELOPER_PLUS, "create repositories")

    # Name uniqueness within org
    if await repo_repo.get_by_name_in_org(org_id, payload.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A repository named '{payload.name}' already exists in this organization.",
        )

    try:
        repo = await repo_repo.create(
            {
                "organization_id": org_id,
                "name": payload.name,
                "description": payload.description,
                "is_private": payload.is_private,
                "created_by": current_user.id,
            }
        )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A repository named '{payload.name}' already exists in this organization.",
        )

    return _repo_to_response(repo)


async def list_repositories(
    db: AsyncSession,
    org_id: uuid.UUID,
    current_user: User,
    page: int,
    page_size: int,
) -> RepositoryListResponse:
    """Return a paginated list of repositories in an organization.

    Any org member (including guest) may list repositories.

    Raises:
        HTTPException 404: Organization not found.
        HTTPException 403: User is not a member.
    """
    org_repo = OrganizationRepository(db)
    repo_repo = RepositoryRepository(db)

    org = await org_repo.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    # Any membership is sufficient to list — guest+ — TODO (Lane A): get_user_org_role call
    role = await get_user_org_role(db, org_id, current_user.id)  # TODO (Lane A)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization.",
        )

    skip = (page - 1) * page_size
    repos = await repo_repo.list_by_org(org_id, skip=skip, limit=page_size)
    total = await repo_repo.count_by_org(org_id)

    return RepositoryListResponse(
        items=[_repo_to_response(r) for r in repos],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_repository(
    db: AsyncSession,
    repo_id: uuid.UUID,
    current_user: User,
) -> RepositoryResponse:
    """Return a single repository by ID.

    Any org member (including guest) may read a repository.

    Raises:
        HTTPException 404: Repository not found.
        HTTPException 403: User is not a member of the repository's organization.
    """
    repo_repo = RepositoryRepository(db)

    repo = await repo_repo.get_by_id(repo_id)
    if repo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        )

    # Any membership is sufficient — guest+ — TODO (Lane A): get_user_org_role call
    role = await get_user_org_role(db, repo.organization_id, current_user.id)  # TODO (Lane A)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this repository's organization.",
        )

    return _repo_to_response(repo)


async def update_repository(
    db: AsyncSession,
    repo_id: uuid.UUID,
    payload: RepositoryUpdate,
    current_user: User,
) -> RepositoryResponse:
    """Update a repository's fields. Requires developer+ role.

    Raises:
        HTTPException 404: Repository not found.
        HTTPException 403: User lacks developer+ role.
        HTTPException 409: New name conflicts with another repo in the same org.
    """
    repo_repo = RepositoryRepository(db)

    repo = await repo_repo.get_by_id(repo_id)
    if repo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        )

    # Permission check — TODO (Lane A): uses get_user_org_role
    await _require_org_member(
        db, repo.organization_id, current_user.id, _DEVELOPER_PLUS, "update repositories"
    )

    update_data = payload.model_dump(exclude_unset=True)

    # Name uniqueness check when renaming
    if "name" in update_data and update_data["name"] != repo.name:
        conflicting = await repo_repo.get_by_name_in_org(
            repo.organization_id, update_data["name"]
        )
        if conflicting is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A repository named '{update_data['name']}' already exists in this organization.",
            )

    if update_data:
        repo = await repo_repo.update(repo, update_data)

    return _repo_to_response(repo)


async def delete_repository(
    db: AsyncSession,
    repo_id: uuid.UUID,
    current_user: User,
) -> None:
    """Delete a repository and all nested resources (via ON DELETE CASCADE).

    Requires maintainer+ role in the organization.

    Raises:
        HTTPException 404: Repository not found.
        HTTPException 403: User lacks maintainer+ role.
    """
    repo_repo = RepositoryRepository(db)

    repo = await repo_repo.get_by_id(repo_id)
    if repo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        )

    # Permission check — TODO (Lane A): uses get_user_org_role
    await _require_org_member(
        db, repo.organization_id, current_user.id, _MAINTAINER_PLUS, "delete repositories"
    )

    await repo_repo.delete(repo)
