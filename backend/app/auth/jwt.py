"""JWT creation and decoding utilities using python-jose.

All datetimes are timezone-aware UTC. Tokens carry a ``type`` claim
(``"access"`` or ``"refresh"``) so that each token kind can only be used
where it is expected.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import ExpiredSignatureError, JWTError, jwt

from app.config.settings import settings


def _utc_now() -> datetime:
    """Return the current timezone-aware UTC datetime."""
    return datetime.now(tz=timezone.utc)


def create_access_token(subject: str) -> str:
    """Create a signed JWT access token.

    Args:
        subject: The identifier to embed as the ``sub`` claim (typically a
                 user ID string).

    Returns:
        A signed JWT string valid for ``ACCESS_TOKEN_EXPIRE_MINUTES`` minutes.
    """
    expire = _utc_now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "exp": expire,
        "iat": _utc_now(),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """Create a signed JWT refresh token.

    Args:
        subject: The identifier to embed as the ``sub`` claim (typically a
                 user ID string).

    Returns:
        A signed JWT string valid for ``REFRESH_TOKEN_EXPIRE_DAYS`` days.
    """
    expire = _utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "refresh",
        "exp": expire,
        "iat": _utc_now(),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token.

    Args:
        token: The raw JWT string to decode.

    Returns:
        The decoded payload as a dictionary.

    Raises:
        ValueError: If the token has expired.
        ValueError: If the token signature is invalid or the token is
                    malformed in any other way.
    """
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except ExpiredSignatureError as exc:
        raise ValueError("Token has expired.") from exc
    except JWTError as exc:
        raise ValueError("Invalid token signature or format.") from exc
