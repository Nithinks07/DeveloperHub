from sqlalchemy.ext.asyncio import AsyncSession
from app.models.pr_review import PRReview
from app.repositories.base import BaseRepository

class PRReviewRepository(BaseRepository[PRReview]):
    """CRUD operations for PR Reviews."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(PRReview, db)
