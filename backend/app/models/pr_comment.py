import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PRComment(Base):
    __tablename__ = "pr_comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    pull_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pull_requests.id", ondelete="CASCADE"),
        nullable=False,
    )

    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    # Optional parent for nested comment threads
    parent_comment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pr_comments.id", ondelete="CASCADE"),
        nullable=True,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Relationships
    pull_request = relationship(
        "PullRequest",
        back_populates="comments",
    )

    author = relationship(
        "User",
    )

    # Self-referential: replies to this comment
    replies: Mapped[List["PRComment"]] = relationship(
        "PRComment",
        back_populates="parent",
        cascade="all, delete",
    )

    parent: Mapped[Optional["PRComment"]] = relationship(
        "PRComment",
        back_populates="replies",
        remote_side="PRComment.id",
    )