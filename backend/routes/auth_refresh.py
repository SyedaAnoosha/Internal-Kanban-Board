from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from supabase_client import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str


@router.post("/refresh", response_model=RefreshResponse)
def refresh_token(request: RefreshRequest):
    """Refresh an expired access token using a valid refresh token."""
    supabase = get_supabase()

    try:
        response = supabase.auth.refresh_session(request.refresh_token)

        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        return RefreshResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}",
        )