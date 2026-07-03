"""RepositoryRepository — data-access layer for the Repository model.

Extends ``BaseRepository`` with repository-specific queries:
  - Name uniqueness check within an organization
  - Paginated list scoped to an organization
  - Count for pagination total
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repository import Repository
from app.repositories.base import BaseRepository


class RepositoryRepository(BaseRepository[Repository]):
    """Repository for Repository CRUD and domain-specific queries."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Repository, db)

    async def get_by_name_in_org(
        self,
        org_id: uuid.UUID,
        name: str,
    ) -> Repository | None:
        """Fetch a repository by name within a specific organization.

        Used for name-uniqueness checks before create/update.

        Args:
            org_id: The organization UUID.
            name:   The repository name to look up.

        Returns:
            The matching Repository, or None if not found.
        """
        result = await self.db.execute(
            select(Repository).where(
                Repository.organization_id == org_id,
                Repository.name == name,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_org(
        self,
        org_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Repository]:
        """Return repositories scoped to an organization (paginated).

        Args:
            org_id: The organization UUID.
            skip:   Number of rows to skip (offset).
            limit:  Maximum rows to return.

        Returns:
            List of Repository instances ordered by creation date descending.
        """
        result = await self.db.execute(
            select(Repository)
            .where(Repository.organization_id == org_id)
            .order_by(Repository.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_org(self, org_id: uuid.UUID) -> int:
        """Count all repositories in an organization.

        Args:
            org_id: The organization UUID.

        Returns:
            Total count as an integer.
        """
        result = await self.db.execute(
            select(func.count()).where(Repository.organization_id == org_id)
        )
        return result.scalar_one()
