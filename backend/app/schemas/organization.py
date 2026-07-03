"""Pydantic v2 schemas for organizations and organization membership.

Covers all request/response shapes defined in the API contract:

Request schemas:
  OrganizationCreate   — POST /organizations
  OrganizationUpdate   — PUT  /organizations/{id}
  MemberInvite         — POST /organizations/{id}/members
  MemberUpdate         — PUT  /organizations/{id}/members/{user_id}

Response schemas:
  OrganizationResponse       — single org (no members)
  OrganizationDetailResponse — single org with members list
  OrganizationListResponse   — paginated org list
  MemberUserResponse         — nested user inside a MemberResponse
  MemberResponse             — single member row
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Role type
# ---------------------------------------------------------------------------

MemberRole = Literal["owner", "admin", "maintainer", "developer", "guest"]


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class OrganizationCreate(BaseModel):
    """Payload for POST /organizations."""

    name: str = Field(..., min_length=1, max_length=255, description="Organization display name.")
    slug: str = Field(
        ...,
        min_length=1,
        max_length=255,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        description="URL-safe slug; lowercase letters, digits, and hyphens only.",
    )
    description: str | None = Field(None, description="Optional description.")


class OrganizationUpdate(BaseModel):
    """Payload for PUT /organizations/{id}. All fields optional."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None


class MemberInvite(BaseModel):
    """Payload for POST /organizations/{id}/members."""

    username: str = Field(..., description="Username of the user to invite.")
    role: MemberRole = Field(..., description="Role to assign.")


class MemberUpdate(BaseModel):
    """Payload for PUT /organizations/{id}/members/{user_id}."""

    role: MemberRole = Field(..., description="New role for the member.")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class MemberUserResponse(BaseModel):
    """Nested user object inside a MemberResponse."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    username: str
    email: str
    full_name: str | None = None


class MemberResponse(BaseModel):
    """Single organization member row."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    user: MemberUserResponse
    role: str
    joined_at: datetime


class OrganizationResponse(BaseModel):
    """Flat organization representation (no members list)."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    owner_id: uuid.UUID
    created_at: datetime


class OrganizationDetailResponse(OrganizationResponse):
    """Organization with full member list — used by GET /organizations/{id}."""

    members: list[MemberResponse] = []


class OrganizationListResponse(BaseModel):
    """Paginated wrapper for GET /organizations."""

    items: list[OrganizationResponse]
    total: int
    page: int
    page_size: int
