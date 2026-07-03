import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Label(Base):
    __tablename__ = "labels"

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "name",
            name="uq_label_name",
        ),
    )

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

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    color: Mapped[str] = mapped_column(
        String(7),
        default="#808080",  # hex color
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    # Relationships
    project = relationship(
        "Project",
        back_populates="labels",
    )

    tasks = relationship(
        "Task",
        secondary="task_labels",
        back_populates="labels",
    )

    issues = relationship(
        "Issue",
        secondary="issue_labels",
        back_populates="labels",
    )