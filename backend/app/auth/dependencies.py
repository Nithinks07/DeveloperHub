"""FastAPI dependency injection for authenticated routes.

Provides two reusable dependencies:

* ``get_current_user``        — decodes the bearer token and returns the User.
* ``get_current_active_user`` — additionally asserts ``user.is_active``.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import decode_token
from app.config.database import get_db
from app.models.user import User
from app.repositories.user import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode the bearer token and return the authenticated User.

    Validates:
    * Token signature and expiry via ``decode_token()``.
    * ``type`` claim equals ``"access"`` (refresh tokens are rejected).
    * The user identified by ``sub`` exists in the database.

    Args:
        token: The raw JWT extracted from the ``Authorization: Bearer`` header.
        db:    An async database session injected by FastAPI.

    Returns:
        The authenticated ``User`` ORM instance.

    Raises:
        HTTPException 401: If the token is invalid, expired, the wrong type,
                           or the user is not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    # Reject refresh tokens used in place of access tokens.
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected an access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user_repo = UserRepository(db)
    try:
        from uuid import UUID
        user = await user_repo.get_by_id(UUID(user_id))
    except (ValueError, AttributeError):
        raise credentials_exception

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Return the current user only if their account is active.

    Args:
        current_user: The authenticated user returned by ``get_current_user``.

    Returns:
        The same ``User`` instance if ``is_active`` is True.

    Raises:
        HTTPException 403: If the user's account has been deactivated.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )
    return current_user
