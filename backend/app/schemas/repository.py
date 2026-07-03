"""Pydantic v2 schemas for repositories.

Covers all request/response shapes defined in the API contract:

Request schemas:
  RepositoryCreate — POST /organizations/{id}/repositories
  RepositoryUpdate — PUT  /repositories/{id}

Response schemas:
  RepositoryResponse     — single repo object
  RepositoryListResponse — paginated repo list
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class RepositoryCreate(BaseModel):
    """Payload for POST /organizations/{organization_id}/repositories."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Repository name; must be unique within the organization.",
    )
    description: str | None = Field(None, description="Optional description.")
    is_private: bool = Field(False, description="Whether the repository is private.")


class RepositoryUpdate(BaseModel):
    """Payload for PUT /repositories/{repository_id}. All fields optional."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_private: bool | None = None
    readme: str | None = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class RepositoryResponse(BaseModel):
    """Single repository object returned by all endpoints."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    description: str | None = None
    is_private: bool
    readme: str | None = None
    created_by: uuid.UUID
    created_at: datetime


class RepositoryListResponse(BaseModel):
    """Paginated wrapper for GET /organizations/{id}/repositories."""

    items: list[RepositoryResponse]
    total: int
    page: int
    page_size: int
