from sqlalchemy.ext.asyncio import AsyncSession
from app.models.issue_comment import IssueComment
from app.repositories.base import BaseRepository

class IssueCommentRepository(BaseRepository[IssueComment]):
    """CRUD operations for Issue Comments."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(IssueComment, db)
