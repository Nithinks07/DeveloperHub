import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Integer, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
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
        default="backlog",  # backlog, todo, in_progress, review, testing, completed
    )

    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",  # low, medium, high, critical
    )

    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
    )

    order: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    created_by: Mapped[uuid.UUID] = mapped_column(
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

    # Relationships
    project = relationship(
        "Project",
        back_populates="tasks",
    )

    assignee = relationship(
        "User",
        back_populates="assigned_tasks",
        foreign_keys=[assigned_to],
    )

    creator = relationship(
        "User",
        back_populates="created_tasks",
        foreign_keys=[created_by],
    )

    labels = relationship(
        "Label",
        secondary="task_labels",
        back_populates="tasks",
    )

    issues = relationship(
        "Issue",
        back_populates="task",
    )