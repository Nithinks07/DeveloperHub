import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue
from app.repositories.base import BaseRepository


class IssueRepository(BaseRepository[Issue]):
    """CRUD operations and custom queries for Issues."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Issue, db)

    async def get_next_number(self, repository_id: uuid.UUID) -> int:
        """
        Calculates the next issue number for a repository by finding the max
        existing number and adding 1. Returns 1 if no issues exist.
        """
        result = await self.db.execute(
            select(func.max(Issue.number)).where(Issue.repository_id == repository_id)
        )
        max_num = result.scalar()
        return (max_num or 0) + 1
