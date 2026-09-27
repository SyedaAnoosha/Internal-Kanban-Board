from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from schemas import NotificationOut
from auth import get_current_user
from supabase_client import get_supabase

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=list[NotificationOut])
def get_notifications(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    res = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", str(current_user["id"]))
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return res.data


@router.get("/unread-count")
def get_unread_count(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    res = (
        supabase.table("notifications")
        .select("id", count="exact")
        .eq("user_id", str(current_user["id"]))
        .eq("is_read", False)
        .execute()
    )
    return {"count": res.count or 0}


@router.patch("/{notification_id}/read")
def mark_read(notification_id: UUID, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    existing = (
        supabase.table("notifications")
        .select("id, user_id")
        .eq("id", str(notification_id))
        .maybe_single()
        .execute()
    )
    if not existing or not existing.data:
        raise HTTPException(404, "Notification not found")
    if str(existing.data["user_id"]) != str(current_user["id"]):
        raise HTTPException(403, "Not your notification")

    supabase.table("notifications").update({"is_read": True}).eq("id", str(notification_id)).execute()
    return {"status": "ok"}


@router.patch("/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    supabase.table("notifications").update({"is_read": True}).eq(
        "user_id", str(current_user["id"])
    ).eq("is_read", False).execute()
    return {"status": "ok"}