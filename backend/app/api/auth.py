"""Authentication API router.

Endpoints
---------
POST /register  — create a new user account (rate-limited: 5/min per IP)
POST /login     — exchange credentials for JWT tokens (rate-limited: 5/min per IP)
POST /refresh   — obtain a new access token from a valid refresh token
POST /logout    — stateless logout (client drops the token)
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.hashing import hash_password, verify_password
from app.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.config.database import get_db
from app.repositories.user import UserRepository
from app.schemas.auth import (
    RefreshTokenRequest,
    TokenResponse,
    UserPublic,
    UserRegister,
)

# ---------------------------------------------------------------------------
# Router & rate-limiter
# ---------------------------------------------------------------------------
# The Limiter instance is created here so it can be imported by main.py and
# attached to the FastAPI application (see main.py for wiring details).
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(tags=["auth"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_to_public(user) -> UserPublic:
    """Serialize a User ORM object to UserPublic, converting UUID → str."""
    return UserPublic(
        id=str(user.id),
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        bio=user.bio,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_email_verified=user.is_email_verified,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@limiter.limit("5/minute")
async def register(
    request: Request,  # required by slowapi's decorator
    payload: UserRegister,
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    """Create a new user account.

    * Validates the request body via ``UserRegister``.
    * Rejects duplicate email or username with a descriptive 409 error.
    * Stores the bcrypt-hashed password — never the plain-text value.
    * Returns the created user (password excluded) with HTTP 201.
    """
    repo = UserRepository(db)

    if await repo.get_by_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )
    if await repo.get_by_username(payload.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken.",
        )

    try:
        user = await repo.create(
            {
                "email": payload.email,
                "username": payload.username,
                "hashed_password": hash_password(payload.password),
            }
        )
    except IntegrityError as exc:
        # Race condition: another request inserted the same email/username
        # between our check above and the INSERT.
        detail = str(exc.orig).lower()
        if "email" in detail:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken.",
        ) from exc

    return _user_to_public(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and obtain JWT tokens",
)
@limiter.limit("5/minute")
async def login(
    request: Request,  # required by slowapi's decorator
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate with email + password and return access & refresh tokens.

    Uses ``OAuth2PasswordRequestForm`` so the endpoint is compatible with the
    standard ``/docs`` Authorize dialog. The ``username`` field of the form is
    treated as the email address.
    """
    repo = UserRepository(db)
    user = await repo.get_by_email(form_data.username)  # form field is "username"

    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Issue a new access token from a refresh token",
)
async def refresh(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Exchange a valid refresh token for a new access token.

    A new refresh token is also issued so that the rotation window keeps
    rolling (optional but recommended for long-lived sessions).

    Raises:
        HTTPException 401: If the token is expired, invalid, or not a refresh token.
    """
    try:
        token_data = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected a refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = token_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing the subject claim.",
        )

    # Confirm the user still exists (not deleted between token issuance and refresh).
    from uuid import UUID
    repo = UserRepository(db)
    user = await repo.get_by_id(UUID(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log out (stateless — client discards tokens)",
)
async def logout() -> None:
    """Stateless logout endpoint.

    Since JWTs are self-contained, true server-side revocation requires a
    blocklist.  The client is responsible for discarding both the access and
    refresh tokens.

    TODO: Implement a Redis-backed token blocklist for server-side revocation.
          On logout, store the token's ``jti`` (JWT ID) claim in Redis with a
          TTL equal to the token's remaining lifetime.  The ``get_current_user``
          dependency should then reject any token whose ``jti`` appears in the
          blocklist before accepting it.  This prevents use of stolen tokens
          after a user explicitly logs out.
    """
    # Nothing to do on the server side for a stateless implementation.
    return None
