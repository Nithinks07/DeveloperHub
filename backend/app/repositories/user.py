"""UserRepository — data-access layer for the User model.

Extends ``BaseRepository`` with user-specific lookup methods needed by the
authentication layer.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User CRUD and lookup operations."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> User | None:
        """Fetch a user by their email address.

        Args:
            email: The email address to look up.

        Returns:
            The matching User instance, or None if not found.
        """
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        """Fetch a user by their username.

        Args:
            username: The username to look up.

        Returns:
            The matching User instance, or None if not found.
        """
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
