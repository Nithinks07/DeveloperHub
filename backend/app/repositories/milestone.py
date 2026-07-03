"""MilestoneRepository — data-access layer for the Milestone model."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.milestone import Milestone
from app.repositories.base import BaseRepository


class MilestoneRepository(BaseRepository[Milestone]):
    """CRUD + domain-specific queries for Milestone."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Milestone, db)

    async def list_by_project(self, project_id: uuid.UUID) -> list[Milestone]:
        """Return all milestones for a project ordered by due_date ascending."""
        result = await self.db.execute(
            select(Milestone)
            .where(Milestone.project_id == project_id)
            .order_by(Milestone.due_date.asc().nullslast())
        )
        return list(result.scalars().all())
