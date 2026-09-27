from fastapi import APIRouter, Depends
from schemas import UserOut
from auth import get_current_user
from supabase_client import get_supabase

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=list[UserOut])
def get_users(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = str(current_user["id"])

    my_memberships = (
        supabase.table("project_members")
        .select("project_id")
        .eq("user_id", user_id)
        .eq("status", "accepted")
        .execute()
    )
    project_ids = [row["project_id"] for row in my_memberships.data if isinstance(row, dict)]

    if project_ids:
        co_members = (
            supabase.table("project_members")
            .select("user:profiles!project_members_user_id_fkey(id, email, full_name)")
            .in_("project_id", project_ids)
            .eq("status", "accepted")
            .execute()
        )
        
        profiles = {p["id"]: p for row in co_members.data if isinstance(row, dict) and (p := row.get("user")) and isinstance(p, dict)}
        
        if user_id not in profiles:
            current_user_profile = (
                supabase.table("profiles")
                .select("id, email, full_name")
                .eq("id", user_id)
                .single()
                .execute()
            )
            if current_user_profile.data:
                profiles[user_id] = current_user_profile.data
                
        return list(profiles.values())
    
    response = (
        supabase.table("profiles")
        .select("id, email, full_name")
        .eq("id", user_id)
        .execute()
    )
    return response.data