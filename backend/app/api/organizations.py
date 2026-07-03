"""Organizations API router.

Endpoints (7 total — matching the API contract exactly):

  POST   /organizations                              — create org (authenticated)
  GET    /organizations                              — list user's orgs (paginated)
  GET    /organizations/{organization_id}            — org detail with members
  PUT    /organizations/{organization_id}            — update org (owner only)
  DELETE /organizations/{organization_id}            — delete org (owner only)
  POST   /organizations/{organization_id}/members   — invite member (owner/admin)
  DELETE /organizations/{organization_id}/members/{user_id} — remove member
  PUT    /organizations/{organization_id}/members/{user_id} — update member role
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.organization import (
    MemberInvite,
    MemberResponse,
    MemberUpdate,
    OrganizationCreate,
    OrganizationDetailResponse,
    OrganizationListResponse,
    OrganizationResponse,
    OrganizationUpdate,
)
from app.services import organization_service

router = APIRouter(prefix="/organizations", tags=["organizations"])

# ---------------------------------------------------------------------------
# Type aliases for injected dependencies
# ---------------------------------------------------------------------------

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Organization CRUD endpoints
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new organization",
)
async def create_organization(
    payload: OrganizationCreate,
    current_user: CurrentUser,
    db: DB,
) -> OrganizationResponse:
    """Create a new organization. The authenticated user becomes the owner."""
    return await organization_service.create_organization(db, payload, current_user)


@router.get(
    "",
    response_model=OrganizationListResponse,
    summary="List organizations for the current user",
)
async def list_organizations(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)."),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page (max 100)."),
) -> OrganizationListResponse:
    """Return a paginated list of organizations the user owns or is a member of."""
    return await organization_service.list_organizations(
        db, current_user.id, page=page, page_size=page_size
    )


@router.get(
    "/{organization_id}",
    response_model=OrganizationDetailResponse,
    summary="Get organization details with member list",
)
async def get_organization(
    organization_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
) -> OrganizationDetailResponse:
    """Return full organization details including the member list."""
    return await organization_service.get_organization_detail(
        db, organization_id, current_user
    )


@router.put(
    "/{organization_id}",
    response_model=OrganizationResponse,
    summary="Update an organization (owner only)",
)
async def update_organization(
    organization_id: uuid.UUID,
    payload: OrganizationUpdate,
    current_user: CurrentUser,
    db: DB,
) -> OrganizationResponse:
    """Update an organization's name and/or description. Restricted to the owner."""
    return await organization_service.update_organization(
        db, organization_id, payload, current_user
    )


@router.delete(
    "/{organization_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an organization (owner only)",
)
async def delete_organization(
    organization_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
) -> None:
    """Hard-delete an organization. All nested resources are removed via CASCADE. Owner only."""
    await organization_service.delete_organization(db, organization_id, current_user)


# ---------------------------------------------------------------------------
# Membership endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/{organization_id}/members",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a user to the organization (owner/admin only)",
)
async def invite_member(
    organization_id: uuid.UUID,
    payload: MemberInvite,
    current_user: CurrentUser,
    db: DB,
) -> MemberResponse:
    """Invite a user by username and assign them a role. Restricted to owners and admins."""
    return await organization_service.invite_member(
        db, organization_id, payload, current_user
    )


@router.delete(
    "/{organization_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a member (owner/admin only)",
)
async def remove_member(
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
) -> None:
    """Remove a member. The organization owner cannot be removed via this endpoint (403)."""
    await organization_service.remove_member(
        db, organization_id, user_id, current_user
    )


@router.put(
    "/{organization_id}/members/{user_id}",
    response_model=MemberResponse,
    summary="Update a member's role (owner/admin only)",
)
async def update_member_role(
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: MemberUpdate,
    current_user: CurrentUser,
    db: DB,
) -> MemberResponse:
    """Update the role of an existing member. Restricted to owners and admins."""
    return await organization_service.update_member_role(
        db, organization_id, user_id, payload, current_user
    )
