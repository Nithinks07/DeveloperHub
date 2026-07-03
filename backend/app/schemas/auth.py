"""Pydantic v2 schemas for authentication request and response payloads."""

import re
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    """Payload for creating a new user account."""

    email: EmailStr = Field(..., description="A valid email address.")
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="3–50 characters; letters, digits, underscores, hyphens only.",
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Minimum 8 characters.",
    )

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, value: str) -> str:
        """Reject usernames that contain characters outside [a-zA-Z0-9_-]."""
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", value):
            raise ValueError(
                "Username may only contain letters, digits, underscores, and hyphens."
            )
        return value

    @field_validator("password")
    @classmethod
    def password_not_whitespace_only(cls, value: str) -> str:
        """Reject passwords that are entirely whitespace."""
        if value.strip() == "":
            raise ValueError("Password must not be blank.")
        return value


class UserLogin(BaseModel):
    """Payload for authenticating with email and password."""

    email: EmailStr = Field(..., description="The account's email address.")
    password: str = Field(..., min_length=1, description="The account password.")


class TokenResponse(BaseModel):
    """Returned after a successful login or token refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Payload for obtaining a new access token via a refresh token."""

    refresh_token: str = Field(..., description="A valid, unexpired refresh token.")


class UserPublic(BaseModel):
    """Public user representation returned after registration (no password)."""

    model_config = {"from_attributes": True}

    id: str
    email: str
    username: str
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    is_active: bool
    is_email_verified: bool
