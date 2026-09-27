from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from datetime import datetime
from typing import Optional
from schemas import (
    ProjectCreate, ProjectOut, ProjectMemberOut, ProjectInvitationOut,
    InviteRequest, InvitationActionRequest, UserOut,
)
from auth import get_current_user
from supabase_client import get_supabase
from permissions import require_project_access, require_project_owner, get_membership
from events import create_notification

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=ProjectOut, status_code=201)
def create_project(project: ProjectCreate, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    payload = {
        "name": project.name,
        "description": project.description,
        "owner_id": str(current_user["id"]),
    }
    res = supabase.table("projects").insert(payload).execute()
    new_project = res.data[0]

    supabase.table("project_members").insert({
        "project_id": new_project["id"],
        "user_id": str(current_user["id"]),
        "role": "owner",
        "status": "accepted",
        "joined_at": datetime.utcnow().isoformat(),
    }).execute()

    return new_project

@router.get("/", response_model=list[ProjectOut])
def get_my_projects(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    res = (
        supabase.table("project_members")
        .select("project:projects!project_members_project_id_fkey(*)")
        .eq("user_id", str(current_user["id"]))
        .eq("status", "accepted")
        .execute()
    )
    
    projects = [row["project"] for row in res.data if row.get("project")]
    projects.sort(key=lambda x: x["created_at"], reverse=True)
    return projects

@router.get("/invitations", response_model=list[ProjectInvitationOut])
def get_my_invitations(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    pending = (
        supabase.table("project_members")
        .select(
            "id, project_id, created_at, "
            "project:projects!project_members_project_id_fkey(name), "
            "invited_by_user:profiles!project_members_invited_by_fkey(id, email, full_name)"
        )
        .eq("user_id", str(current_user["id"]))
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    
    result = []
    for row in pending.data:
        project_data = row.get("project") or {}
        result.append({
            "id": row["id"],
            "project_id": row["project_id"],
            "project_name": project_data.get("name", "Unknown Project"),
            "invited_by": row.get("invited_by_user"),
            "created_at": row["created_at"],
        })
    return result

@router.patch("/invitations/{member_id}")
def respond_to_invitation(
    member_id: UUID,
    body: InvitationActionRequest,
    current_user: dict = Depends(get_current_user),
):
    if body.action not in ("accept", "decline"):
        raise HTTPException(400, "action must be 'accept' or 'decline'")

    supabase = get_supabase()
    row_res = supabase.table("project_members").select("*").eq("id", str(member_id)).single().execute()
    row = row_res.data
    if not row:
        raise HTTPException(404, "Invitation not found")
    if str(row["user_id"]) != str(current_user["id"]):
        raise HTTPException(403, "This invitation does not belong to you")
    if row["status"] != "pending":
        raise HTTPException(400, f"Invitation already {row['status']}")

    new_status = "accepted" if body.action == "accept" else "declined"
    update_payload = {"status": new_status}
    if new_status == "accepted":
        update_payload["joined_at"] = datetime.utcnow().isoformat()

    supabase.table("project_members").update(update_payload).eq("id", str(member_id)).execute()
    return {"status": "ok", "result": new_status}

@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
def get_project_members(project_id: UUID, current_user: dict = Depends(get_current_user)):
    require_project_access(str(project_id), str(current_user["id"]))

    supabase = get_supabase()
    members_res = (
        supabase.table("project_members")
        .select("*, user:profiles!project_members_user_id_fkey(id, email, full_name)")
        .eq("project_id", str(project_id))
        .order("created_at")
        .execute()
    )
    return members_res.data

@router.get("/{project_id}/search-users", response_model=list[UserOut])
def search_users_for_invite(
    project_id: UUID,
    q: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
):
    require_project_owner(str(project_id), str(current_user["id"]))

    supabase = get_supabase()
    existing = (
        supabase.table("project_members")
        .select("user_id")
        .eq("project_id", str(project_id))
        .execute()
    )
    existing_ids = {row["user_id"] for row in existing.data if isinstance(row, dict)}

    pattern = f"%{q}%"
    res = (
        supabase.table("profiles")
        .select("id, email, full_name")
        .or_(f"email.ilike.{pattern},full_name.ilike.{pattern}")
        .limit(10)
        .execute()
    )
    return [u for u in res.data if u["id"] not in existing_ids]

@router.post("/{project_id}/invite", status_code=201)
def invite_member(
    project_id: UUID,
    invite: InviteRequest,
    current_user: dict = Depends(get_current_user),
):
    require_project_owner(str(project_id), str(current_user["id"]))

    supabase = get_supabase()
    profile_res = (
        supabase.table("profiles")
        .select("id, email, full_name")
        .ilike("email", invite.email)
        .maybe_single()
        .execute()
    )
    target = profile_res.data if profile_res and isinstance(profile_res.data, dict) else None
    if not target:
        raise HTTPException(404, "No user found with that email")

    if str(target["id"]) == str(current_user["id"]):
        raise HTTPException(400, "You are already the owner of this project")

    existing = get_membership(str(project_id), target["id"])
    if existing:
        if existing["status"] == "accepted":
            raise HTTPException(400, "This user is already a member of the project")
        if existing["status"] == "pending":
            raise HTTPException(400, "This user already has a pending invitation")
        supabase.table("project_members").update({
            "status": "pending",
            "invited_by": str(current_user["id"]),
        }).eq("id", existing["id"]).execute()
    else:
        supabase.table("project_members").insert({
            "project_id": str(project_id),
            "user_id": target["id"],
            "role": "member",
            "status": "pending",
            "invited_by": str(current_user["id"]),
        }).execute()

    project_res = supabase.table("projects").select("name").eq("id", str(project_id)).single().execute()
    project_name = project_res.data.get("name", "a project") if project_res.data and isinstance(project_res.data, dict) else "a project"
    create_notification(
        title="Project Invitation",
        user_id=target["id"],
        notif_type="project_invite",
        message=f"You were invited to join {project_name}",
        project_id=str(project_id),
    )

    return {"status": "ok", "message": "Invitation sent"}

@router.delete("/{project_id}/members/{member_id}", status_code=204)
def remove_member(
    project_id: UUID,
    member_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    require_project_owner(str(project_id), str(current_user["id"]))

    supabase = get_supabase()
    member_res = supabase.table("project_members").select("*").eq("id", str(member_id)).single().execute()
    member = member_res.data
    if not isinstance(member, dict) or str(member.get("project_id")) != str(project_id):
        raise HTTPException(404, "Member not found")
    if member.get("role") == "owner":
        raise HTTPException(400, "Cannot remove the project owner")

    supabase.table("project_members").delete().eq("id", str(member_id)).execute()
    return None

@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: UUID, project: ProjectCreate, current_user: dict = Depends(get_current_user)):
    require_project_owner(str(project_id), str(current_user["id"]))

    supabase = get_supabase()
    payload = {
        "name": project.name,
        "description": project.description,
        "updated_at": datetime.utcnow().isoformat(),
    }
    update_res = supabase.table("projects").update(payload).eq("id", str(project_id)).execute()
    if not update_res.data:
        raise HTTPException(404, "Project not found")
    return update_res.data[0]

@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: UUID, current_user: dict = Depends(get_current_user)):
    require_project_owner(str(project_id), str(current_user["id"]))

    supabase = get_supabase()
    supabase.table("projects").delete().eq("id", str(project_id)).execute()
    return None