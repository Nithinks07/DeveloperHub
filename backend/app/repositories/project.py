"""ProjectRepository — data-access layer for the Project model."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    """CRUD + domain-specific queries for Project."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Project, db)

    async def get_with_relations(self, project_id: uuid.UUID) -> Project | None:
        """Fetch a project with tasks (ordered), labels, and milestones eager-loaded.

        Used by GET /projects/{id} to build the tasks_by_status response.
        """
        result = await self.db.execute(
            select(Project)
            .options(
                selectinload(Project.tasks),
                selectinload(Project.labels),
                selectinload(Project.milestones),
            )
            .where(Project.id == project_id)
        )
        return result.scalar_one_or_none()

    async def list_by_repository(
        self,
        repo_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Project]:
        """Return projects scoped to a repository (paginated), newest first."""
        result = await self.db.execute(
            select(Project)
            .where(Project.repository_id == repo_id)
            .order_by(Project.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_repository(self, repo_id: uuid.UUID) -> int:
        """Count all projects in a repository."""
        result = await self.db.execute(
            select(func.count()).where(Project.repository_id == repo_id)
        )
        return result.scalar_one()
