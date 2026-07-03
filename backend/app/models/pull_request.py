import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PullRequest(Base):
    __tablename__ = "pull_requests"

    __table_args__ = (
        UniqueConstraint(
            "repository_id",
            "number",
            name="uq_pr_number",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Optional link to an issue; PRs can exist without a linked issue
    issue_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("issues.id", ondelete="SET NULL"),
        nullable=True,
    )

    number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="open",  # open, merged, closed
    )

    source_branch: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    target_branch: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="main",
    )

    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
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

    merged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    merged_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
    )

    # Relationships
    repository = relationship(
        "Repository",
        back_populates="pull_requests",
    )

    issue = relationship(
        "Issue",
        back_populates="pull_requests",
    )

    author = relationship(
        "User",
        foreign_keys=[author_id],
    )

    merger = relationship(
        "User",
        foreign_keys=[merged_by],
    )

    comments = relationship(
        "PRComment",
        back_populates="pull_request",
        cascade="all, delete",
    )

    reviews = relationship(
        "PRReview",
        back_populates="pull_request",
        cascade="all, delete",
    )