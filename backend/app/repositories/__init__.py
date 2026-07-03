# Data access layer: repository classes that encapsulate database queries.

from app.repositories.base import BaseRepository
from app.repositories.user import UserRepository

__all__ = ["BaseRepository", "UserRepository"]
