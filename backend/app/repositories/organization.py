"""OrganizationRepository — data-access layer for the Organization model.

Extends ``BaseRepository`` with organization-specific queries:
  - Slug uniqueness lookup
  - Paginated list of organizations a user owns or is a member of
  - Eager-loading of members + nested user for detail view
"""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.repositories.base import BaseRepository


class OrganizationRepository(BaseRepository[Organization]):
    """Repository for Organization CRUD and domain-specific queries."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Organization, db)

    async def get_by_slug(self, slug: str) -> Organization | None:
        """Fetch an organization by its unique slug.

        Args:
            slug: The URL-safe slug to look up.

        Returns:
            The matching Organization, or None if not found.
        """
        result = await self.db.execute(
            select(Organization).where(Organization.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_user_organizations(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Organization]:
        """Return all organizations the user owns or is a member of (paginated).

        Args:
            user_id:  The user's UUID.
            skip:     Number of rows to skip (for pagination offset).
            limit:    Maximum rows to return.

        Returns:
            List of Organization instances.
        """
        stmt = (
            select(Organization)
            .outerjoin(
                OrganizationMember,
                OrganizationMember.organization_id == Organization.id,
            )
            .where(
                or_(
                    Organization.owner_id == user_id,
                    OrganizationMember.user_id == user_id,
                )
            )
            .distinct()
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_user_organizations(self, user_id: uuid.UUID) -> int:
        """Count all organizations the user owns or is a member of.

        Args:
            user_id: The user's UUID.

        Returns:
            Total count as an integer.
        """
        subq = (
            select(Organization.id)
            .outerjoin(
                OrganizationMember,
                OrganizationMember.organization_id == Organization.id,
            )
            .where(
                or_(
                    Organization.owner_id == user_id,
                    OrganizationMember.user_id == user_id,
                )
            )
            .distinct()
            .subquery()
        )
        result = await self.db.execute(select(func.count()).select_from(subq))
        return result.scalar_one()

    async def get_with_members(self, org_id: uuid.UUID) -> Organization | None:
        """Fetch an organization with its members and each member's user eagerly loaded.

        Args:
            org_id: The organization's UUID.

        Returns:
            The Organization (with .members populated), or None if not found.
        """
        result = await self.db.execute(
            select(Organization)
            .options(
                selectinload(Organization.members).selectinload(OrganizationMember.user)
            )
            .where(Organization.id == org_id)
        )
        return result.scalar_one_or_none()
