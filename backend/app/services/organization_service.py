"""Organization service layer.

Contains all business logic for organizations and membership:
  - Slug uniqueness enforcement (409 Conflict)
  - Owner-only guards for update and delete (403 Forbidden)
  - Owner/admin-only guards for member management (403 Forbidden)
  - Owner-removal guard (403 Forbidden)
  - User lookup by username for invite (404 Not Found)
  - Duplicate membership prevention (409 Conflict)

Routes should only call this service; they must never touch the DB directly.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.repositories.organization import OrganizationRepository
from app.repositories.organization_member import OrganizationMemberRepository
from app.repositories.user import UserRepository
from app.schemas.organization import (
    MemberInvite,
    MemberUpdate,
    OrganizationCreate,
    OrganizationDetailResponse,
    OrganizationListResponse,
    OrganizationResponse,
    MemberResponse,
    MemberUserResponse,
)

# ---------------------------------------------------------------------------
# Role permission constants
# ---------------------------------------------------------------------------

_MANAGE_ORG_ROLES = {"owner"}          # update / delete organization
_MANAGE_MEMBER_ROLES = {"owner", "admin"}  # invite / remove / update members

# Role ordering used by permission checks in other services (Lane B+).
# Higher index = more privileged; "owner" is the most privileged.
_ROLE_ORDER: dict[str, int] = {
    "guest": 0,
    "developer": 1,
    "maintainer": 2,
    "admin": 3,
    "owner": 4,
}


# ---------------------------------------------------------------------------
# Public helper: role lookup (stub interface consumed by Lane B)
# ---------------------------------------------------------------------------

async def get_user_org_role(
    db: AsyncSession,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
) -> str | None:
    """Return the user's role in the org, or None if not a member.

    Role values: 'owner' | 'admin' | 'maintainer' | 'developer' | 'guest'

    This function is defined here in app/services/organization_service.py and
    is imported by repository_service.py (Lane B) and any future lane that
    needs org-level permission checks.

    Args:
        db:      Async database session.
        org_id:  The organization UUID.
        user_id: The user UUID.

    Returns:
        The user's role string, or None if the user is not a member.
    """
    member_repo = OrganizationMemberRepository(db)
    member = await member_repo.get_member(org_id, user_id)
    return member.role if member is not None else None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _assert_org_manager(member: OrganizationMember | None, action: str = "perform this action") -> None:
    """Raise 403 if the current user is not owner of the org."""
    if member is None or member.role not in _MANAGE_ORG_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only the organization owner can {action}.",
        )


def _assert_member_manager(member: OrganizationMember | None, action: str = "manage members") -> None:
    """Raise 403 if the current user cannot manage members (owner or admin)."""
    if member is None or member.role not in _MANAGE_MEMBER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only owners and admins can {action}.",
        )


def _org_to_response(org: Organization) -> OrganizationResponse:
    """Convert an Organization ORM instance to OrganizationResponse."""
    return OrganizationResponse.model_validate(org)


def _member_to_response(m: OrganizationMember) -> MemberResponse:
    """Convert an OrganizationMember ORM instance (with .user loaded) to MemberResponse."""
    return MemberResponse(
        id=m.id,
        user=MemberUserResponse(
            id=m.user.id,
            username=m.user.username,
            email=m.user.email,
            full_name=m.user.full_name,
        ),
        role=m.role,
        joined_at=m.joined_at,
    )


# ---------------------------------------------------------------------------
# Organization CRUD
# ---------------------------------------------------------------------------

async def create_organization(
    db: AsyncSession,
    payload: OrganizationCreate,
    current_user: User,
) -> OrganizationResponse:
    """Create a new organization; the caller becomes the owner.

    Raises:
        HTTPException 409: If the slug is already taken.
    """
    org_repo = OrganizationRepository(db)
    member_repo = OrganizationMemberRepository(db)

    # Slug uniqueness check
    if await org_repo.get_by_slug(payload.slug):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An organization with slug '{payload.slug}' already exists.",
        )

    try:
        org = await org_repo.create(
            {
                "name": payload.name,
                "slug": payload.slug,
                "description": payload.description,
                "owner_id": current_user.id,
            }
        )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An organization with slug '{payload.slug}' already exists.",
        )

    # Create owner membership record
    await member_repo.create(
        {
            "organization_id": org.id,
            "user_id": current_user.id,
            "role": "owner",
        }
    )

    return _org_to_response(org)


async def list_organizations(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int,
    page_size: int,
) -> OrganizationListResponse:
    """Return a paginated list of organizations the user owns or is a member of."""
    org_repo = OrganizationRepository(db)

    skip = (page - 1) * page_size
    orgs = await org_repo.get_user_organizations(user_id, skip=skip, limit=page_size)
    total = await org_repo.count_user_organizations(user_id)

    return OrganizationListResponse(
        items=[_org_to_response(o) for o in orgs],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_organization_detail(
    db: AsyncSession,
    org_id: uuid.UUID,
    current_user: User,
) -> OrganizationDetailResponse:
    """Return organization detail with member list.

    The user must own or be a member of the organization to view it.

    Raises:
        HTTPException 404: If the organization does not exist.
        HTTPException 403: If the user is not a member or owner.
    """
    org_repo = OrganizationRepository(db)
    member_repo = OrganizationMemberRepository(db)

    org = await org_repo.get_with_members(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    # Verify the caller is a member or owner
    caller_member = await member_repo.get_member(org_id, current_user.id)
    if caller_member is None and org.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization.",
        )

    return OrganizationDetailResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        description=org.description,
        owner_id=org.owner_id,
        created_at=org.created_at,
        members=[_member_to_response(m) for m in org.members],
    )


async def update_organization(
    db: AsyncSession,
    org_id: uuid.UUID,
    payload: OrganizationUpdate,
    current_user: User,
) -> OrganizationResponse:
    """Update an organization's name and/or description. Owner only.

    Raises:
        HTTPException 404: Organization not found.
        HTTPException 403: Caller is not the owner.
    """
    org_repo = OrganizationRepository(db)
    member_repo = OrganizationMemberRepository(db)

    org = await org_repo.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    caller_member = await member_repo.get_member(org_id, current_user.id)
    _assert_org_manager(caller_member, "update this organization")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        org = await org_repo.update(org, update_data)

    return _org_to_response(org)


async def delete_organization(
    db: AsyncSession,
    org_id: uuid.UUID,
    current_user: User,
) -> None:
    """Delete an organization and all its nested resources (via ON DELETE CASCADE). Owner only.

    Raises:
        HTTPException 404: Organization not found.
        HTTPException 403: Caller is not the owner.
    """
    org_repo = OrganizationRepository(db)
    member_repo = OrganizationMemberRepository(db)

    org = await org_repo.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    caller_member = await member_repo.get_member(org_id, current_user.id)
    _assert_org_manager(caller_member, "delete this organization")

    await org_repo.delete(org)


# ---------------------------------------------------------------------------
# Membership management
# ---------------------------------------------------------------------------

async def invite_member(
    db: AsyncSession,
    org_id: uuid.UUID,
    payload: MemberInvite,
    current_user: User,
) -> MemberResponse:
    """Invite a user to an organization by username. Owner/admin only.

    Raises:
        HTTPException 404: Organization or target user not found.
        HTTPException 403: Caller lacks permission.
        HTTPException 409: User is already a member.
    """
    org_repo = OrganizationRepository(db)
    member_repo = OrganizationMemberRepository(db)
    user_repo = UserRepository(db)

    org = await org_repo.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    caller_member = await member_repo.get_member(org_id, current_user.id)
    _assert_member_manager(caller_member, "invite members")

    # Look up the invitee by username
    target_user = await user_repo.get_by_username(payload.username)
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{payload.username}' not found.",
        )

    # Duplicate membership check
    existing = await member_repo.get_member(org_id, target_user.id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"'{payload.username}' is already a member of this organization.",
        )

    try:
        new_member = await member_repo.create(
            {
                "organization_id": org_id,
                "user_id": target_user.id,
                "role": payload.role,
            }
        )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"'{payload.username}' is already a member of this organization.",
        )

    # Eager-load the user relationship for the response
    new_member.user = target_user
    return _member_to_response(new_member)


async def remove_member(
    db: AsyncSession,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User,
) -> None:
    """Remove a member from an organization. Owner/admin only.

    The owner member cannot be removed via this endpoint.

    Raises:
        HTTPException 404: Organization or member not found.
        HTTPException 403: Caller lacks permission, or target is the owner.
    """
    org_repo = OrganizationRepository(db)
    member_repo = OrganizationMemberRepository(db)

    org = await org_repo.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    caller_member = await member_repo.get_member(org_id, current_user.id)
    _assert_member_manager(caller_member, "remove members")

    target_member = await member_repo.get_member(org_id, user_id)
    if target_member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this organization.",
        )

    # Owner-removal guard — per contract
    if target_member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner cannot be removed; transfer ownership first.",
        )

    await member_repo.delete(target_member)


async def update_member_role(
    db: AsyncSession,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: MemberUpdate,
    current_user: User,
) -> MemberResponse:
    """Update a member's role. Owner/admin only.

    Raises:
        HTTPException 404: Organization or member not found.
        HTTPException 403: Caller lacks permission.
    """
    org_repo = OrganizationRepository(db)
    member_repo = OrganizationMemberRepository(db)

    org = await org_repo.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    caller_member = await member_repo.get_member(org_id, current_user.id)
    _assert_member_manager(caller_member, "update member roles")

    target_member = await member_repo.get_member(org_id, user_id)
    if target_member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this organization.",
        )

    # Reload with user relationship for the response
    members_with_users = await member_repo.get_org_members(org_id)
    target_member_with_user = next(
        (m for m in members_with_users if m.user_id == user_id), None
    )
    if target_member_with_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this organization.",
        )

    updated = await member_repo.update(target_member_with_user, {"role": payload.role})
    return _member_to_response(updated)
