from sqlalchemy.ext.asyncio import AsyncSession
from app.models.pr_comment import PRComment
from app.repositories.base import BaseRepository

class PRCommentRepository(BaseRepository[PRComment]):
    """CRUD operations for PR Comments."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(PRComment, db)
