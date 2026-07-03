import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Issue(Base):
    __tablename__ = "issues"

    __table_args__ = (
        UniqueConstraint(
            "repository_id",
            "number",
            name="uq_issue_number",
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

    # Optional link to a Kanban task; issues can exist independently of tasks
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
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
        default="open",  # open, closed
    )

    # bug | feature | task | enhancement | research | documentation
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="task",
    )

    priority: Mapped[str] = mapped_column(
        String(20),
        default="medium",  # low, medium, high, critical
    )

    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
    )

    milestone_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("milestones.id"),
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
    repository = relationship(
        "Repository",
        back_populates="issues",
    )

    task = relationship(
        "Task",
        back_populates="issues",
    )

    assignee = relationship(
        "User",
        foreign_keys=[assigned_to],
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by],
    )

    milestone = relationship(
        "Milestone",
        back_populates="issues",
    )

    labels = relationship(
        "Label",
        secondary="issue_labels",
        back_populates="issues",
    )

    pull_requests = relationship(
        "PullRequest",
        back_populates="issue",
    )

    comments = relationship(
        "IssueComment",
        back_populates="issue",
        cascade="all, delete",
    )