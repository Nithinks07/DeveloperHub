"""OrganizationMemberRepository — data-access layer for OrganizationMember.

Extends ``BaseRepository`` with membership-specific queries:
  - Lookup of a specific (org, user) membership row
  - Full member list with eager-loaded user relationships
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization_member import OrganizationMember
from app.repositories.base import BaseRepository


class OrganizationMemberRepository(BaseRepository[OrganizationMember]):
    """Repository for OrganizationMember CRUD and lookup operations."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(OrganizationMember, db)

    async def get_member(
        self,
        org_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> OrganizationMember | None:
        """Fetch a specific membership record for a (organization, user) pair.

        Args:
            org_id:  The organization's UUID.
            user_id: The user's UUID.

        Returns:
            The matching OrganizationMember, or None if not found.
        """
        result = await self.db.execute(
            select(OrganizationMember)
            .where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_org_members(self, org_id: uuid.UUID) -> list[OrganizationMember]:
        """Return all members of an organization with their user eagerly loaded.

        Args:
            org_id: The organization's UUID.

        Returns:
            List of OrganizationMember instances with .user populated.
        """
        result = await self.db.execute(
            select(OrganizationMember)
            .options(selectinload(OrganizationMember.user))
            .where(OrganizationMember.organization_id == org_id)
        )
        return list(result.scalars().all())
