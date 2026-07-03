import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Repository(Base):
    __tablename__ = "repositories"

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "name",
            name="uq_repository_name",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(Text)

    is_private: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    readme: Mapped[str | None] = mapped_column(Text)

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    # Relationships
    organization = relationship(
        "Organization",
        back_populates="repositories",
    )

    creator = relationship(
        "User",
        back_populates="repositories",
    )

    projects = relationship(
        "Project",
        back_populates="repository",
        cascade="all, delete",
    )

    issues = relationship(
        "Issue",
        back_populates="repository",
        cascade="all, delete",
    )

    pull_requests = relationship(
        "PullRequest",
        back_populates="repository",
        cascade="all, delete",
    )