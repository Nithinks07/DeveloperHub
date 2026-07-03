import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pull_request import PullRequest
from app.repositories.base import BaseRepository


class PullRequestRepository(BaseRepository[PullRequest]):
    """CRUD operations for Pull Requests."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(PullRequest, db)

    async def get_next_number(self, repository_id: uuid.UUID) -> int:
        """
        Calculates the next PR number for a repository by finding the max
        existing number and adding 1. Returns 1 if no PRs exist.
        """
        result = await self.db.execute(
            select(func.max(PullRequest.number)).where(PullRequest.repository_id == repository_id)
        )
        max_num = result.scalar()
        return (max_num or 0) + 1
