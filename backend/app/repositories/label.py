"""LabelRepository — data-access layer for the Label model."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.label import Label
from app.repositories.base import BaseRepository


class LabelRepository(BaseRepository[Label]):
    """CRUD + domain-specific queries for Label."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Label, db)

    async def get_by_name_in_project(self, project_id: uuid.UUID, name: str) -> Label | None:
        """Check label name uniqueness within a project."""
        result = await self.db.execute(
            select(Label).where(Label.project_id == project_id, Label.name == name)
        )
        return result.scalar_one_or_none()
