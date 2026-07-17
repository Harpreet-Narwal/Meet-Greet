from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.config import Settings, get_settings

SettingsDep = Annotated[Settings, Depends(get_settings)]


async def require_internal_token(
    settings: SettingsDep,
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """api → ai calls carry `Authorization: Bearer $INTERNAL_API_TOKEN`.

    The ai service is never exposed publicly; this guards against accidental exposure.
    """
    expected = f"Bearer {settings.internal_api_token}"
    if authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing or invalid internal token",
        )
