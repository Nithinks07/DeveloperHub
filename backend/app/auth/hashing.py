"""Password hashing utilities using passlib's bcrypt scheme."""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt.

    Args:
        password: The plain-text password to hash.

    Returns:
        The bcrypt-hashed password string.
    """
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash.

    Args:
        plain:   The plain-text password provided by the user.
        hashed:  The stored bcrypt hash to verify against.

    Returns:
        True if the password matches the hash, False otherwise.
    """
    return pwd_context.verify(plain, hashed)
