"""TaskRepository — data-access layer for the Task model.

The most critical query here is get_max_order_in_column, which is used by
the drag-drop reorder logic to avoid gaps and duplicate order values.
"""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    """CRUD + domain-specific queries for Task."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Task, db)

    async def get_max_order_in_column(
        self,
        project_id: uuid.UUID,
        status: str,
        exclude_task_id: uuid.UUID | None = None,
    ) -> int:
        """Return the current maximum order value in a Kanban column.

        Args:
            project_id:      Scoping project.
            status:          The column (e.g. 'backlog', 'in_progress').
            exclude_task_id: Optionally exclude a task (used when moving
                             the task itself and counting its destination column).

        Returns:
            The max order integer, or -1 if the column is empty.
        """
        stmt = select(func.max(Task.order)).where(
            Task.project_id == project_id,
            Task.status == status,
        )
        if exclude_task_id is not None:
            stmt = stmt.where(Task.id != exclude_task_id)
        result = await self.db.execute(stmt)
        max_val = result.scalar_one_or_none()
        return max_val if max_val is not None else -1

    async def get_tasks_in_column_ordered(
        self,
        project_id: uuid.UUID,
        status: str,
        exclude_task_id: uuid.UUID | None = None,
    ) -> list[Task]:
        """Return all tasks in a column ordered by current order value.

        Excludes the task being moved so we can re-number the remaining ones.
        """
        stmt = (
            select(Task)
            .where(Task.project_id == project_id, Task.status == status)
            .order_by(Task.order)
        )
        if exclude_task_id is not None:
            stmt = stmt.where(Task.id != exclude_task_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def bulk_update_order(self, task_orders: list[tuple[uuid.UUID, int]]) -> None:
        """Bulk-update the order field for a list of (task_id, new_order) pairs.

        Uses individual UPDATE statements in the same transaction to avoid
        locking issues. This is called after computing the final order array
        to ensure no gaps or duplicates.
        """
        for task_id, new_order in task_orders:
            await self.db.execute(
                update(Task)
                .where(Task.id == task_id)
                .values(order=new_order)
            )
