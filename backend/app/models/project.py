"""Full Project model — Lane C implementation."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import func

from app.models.base import Base


class Project(Base):
    __tablename__ = "projects"

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

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",  # active, archived
    )

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    repository = relationship(
        "Repository",
        back_populates="projects",
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by],
    )

    tasks = relationship(
        "Task",
        back_populates="project",
        cascade="all, delete",
        order_by="Task.order",
    )

    labels = relationship(
        "Label",
        back_populates="project",
        cascade="all, delete",
    )

    milestones = relationship(
        "Milestone",
        back_populates="project",
        cascade="all, delete",
    )
