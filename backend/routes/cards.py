from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from datetime import datetime
from typing import Optional
from schemas import CardCreate, CardUpdate, CardOut
from auth import get_current_user
from supabase_client import get_supabase
from events import log_card_event, create_notification
from permissions import require_project_access

router = APIRouter(prefix="/cards", tags=["cards"])

def get_done_column_id():
    supabase = get_supabase()
    res = supabase.table("columns").select("id").eq("name", "Done").single().execute()
    return res.data['id'] if res.data else None

def _get_card_or_404(card_id: str) -> dict:
    supabase = get_supabase()
    res = supabase.table("cards").select("*").eq("id", card_id).eq("is_deleted", "false").single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Card not found")
    return res.data

@router.get("/", response_model=list[CardOut])
def get_cards(
    project_id: Optional[UUID] = None,
    personal: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()
    query = supabase.table("cards").select("*").eq("is_deleted", "false")
    
    if project_id:
        query = query.eq("project_id", str(project_id))
    elif personal:
        query = query.eq("owner_id", str(current_user["id"]))
        
    response = query.order("position").execute()
    return response.data

@router.post("/", response_model=CardOut, status_code=201)
def create_card(card: CardCreate, current_user: dict = Depends(get_current_user)):
    require_project_access(str(card.project_id), str(current_user["id"]))
    supabase = get_supabase()
    payload = card.model_dump(exclude_unset=True)
    payload["assigned_by"] = str(current_user["id"])
    if not payload.get("owner_id"):
        payload["owner_id"] = str(current_user["id"])

    payload['column_id'] = str(payload['column_id'])
    payload['project_id'] = str(payload['project_id'])
    if payload.get('owner_id'):
        payload['owner_id'] = str(payload['owner_id'])

    response = supabase.table("cards").insert(payload).execute()
    new_card = response.data[0]

    log_card_event(
        card_id=new_card['id'],
        event_type="created",
        to_column_id=new_card['column_id'],
        actor_id=str(current_user['id'])
    )

    if new_card.get("owner_id") and new_card["owner_id"] != str(current_user["id"]):
        create_notification(
            user_id=new_card["owner_id"],
            notif_type="task_assigned",
            title=f"You were assigned: {new_card['title']}",
            project_id=new_card["project_id"],
            card_id=new_card["id"],
        )

    return new_card

@router.patch("/{card_id}", response_model=CardOut)
def update_card(card_id: UUID, card_update: CardUpdate, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    current_card = _get_card_or_404(str(card_id))
    require_project_access(str(current_card["project_id"]), str(current_user["id"]))

    payload = card_update.model_dump(exclude_unset=True)
    if not payload:
        return current_card

    owner_changed = payload.get("owner_id") and str(payload["owner_id"]) != str(current_card.get("owner_id"))
    if owner_changed:
        payload["assigned_by"] = str(current_user["id"])

    done_column_id = get_done_column_id()

    if payload.get("column_id"):
        new_col_id = str(payload["column_id"])
        old_col_id = str(current_card["column_id"])

        if new_col_id == done_column_id and old_col_id != done_column_id:
            payload["completed_at"] = datetime.utcnow().isoformat()
        elif new_col_id != done_column_id and old_col_id == done_column_id:
            payload["completed_at"] = None

    payload["updated_at"] = datetime.utcnow().isoformat()

    if payload.get("column_id"): payload["column_id"] = str(payload["column_id"])
    if payload.get("owner_id"): payload["owner_id"] = str(payload["owner_id"])
    if payload.get("assigned_by"): payload["assigned_by"] = str(payload["assigned_by"])

    response = supabase.table("cards").update(payload).eq("id", str(card_id)).execute()
    updated_card = response.data[0]

    if payload.get("column_id") and str(payload["column_id"]) != str(current_card["column_id"]):
        log_card_event(
            card_id=str(card_id),
            event_type="moved",
            from_column_id=current_card["column_id"],
            to_column_id=payload["column_id"],
            actor_id=str(current_user['id'])
        )

    if owner_changed:
        log_card_event(
            card_id=str(card_id),
            event_type="assigned",
            metadata={"new_owner_id": payload["owner_id"]},
            actor_id=str(current_user['id'])
        )
        create_notification(
            user_id=payload["owner_id"],
            notif_type="task_assigned",
            title=f"You were assigned: {updated_card['title']}",
            project_id=updated_card["project_id"],
            card_id=str(card_id),
        )

    return updated_card

@router.delete("/{card_id}", status_code=204)
def delete_card(card_id: UUID, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    supabase.table("cards").update({
        "is_deleted": True,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(card_id)).execute()
    return None

@router.post("/{card_id}/submit-review")
def submit_for_review(card_id: UUID, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    card = _get_card_or_404(str(card_id))
    require_project_access(str(card["project_id"]), str(current_user["id"]))

    if str(current_user["id"]) != str(card.get("owner_id")):
        raise HTTPException(403, "Only the task owner can submit for review")

    col_res = supabase.table("columns").select("id").eq("name", "Under Review").single().execute()
    if not col_res.data:
        raise HTTPException(500, "'Under Review' column not found in database")

    supabase.table("cards").update({
        "column_id": col_res.data["id"],
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(card_id)).execute()

    log_card_event(card_id=str(card_id), event_type="submitted_review", actor_id=str(current_user["id"]))

    if card.get("assigned_by"):
        create_notification(
            user_id=card["assigned_by"],
            notif_type="review_requested",
            title=f"\"{card['title']}\" was moved to Under Review",
            project_id=card["project_id"],
            card_id=str(card_id),
        )

    return {"status": "ok"}

@router.post("/{card_id}/approve")
def approve_card(card_id: UUID, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    card = _get_card_or_404(str(card_id))
    require_project_access(str(card["project_id"]), str(current_user["id"]))

    if str(current_user["id"]) != str(card.get("assigned_by")):
        raise HTTPException(403, "Only the person who assigned this task can approve it")

    done_col_res = supabase.table("columns").select("id").eq("name", "Done").single().execute()
    if not done_col_res.data:
        raise HTTPException(500, "'Done' column not found in database")

    supabase.table("cards").update({
        "column_id": done_col_res.data["id"],
        "completed_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(card_id)).execute()

    log_card_event(card_id=str(card_id), event_type="approved", actor_id=str(current_user["id"]))

    if card.get("owner_id"):
        create_notification(
            user_id=card["owner_id"],
            notif_type="review_approved",
            title=f"\"{card['title']}\" was approved",
            project_id=card["project_id"],
            card_id=str(card_id),
        )

    return {"status": "ok"}

@router.post("/{card_id}/request-changes")
def request_changes(card_id: UUID, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    card = _get_card_or_404(str(card_id))
    require_project_access(str(card["project_id"]), str(current_user["id"]))

    if str(current_user["id"]) != str(card.get("assigned_by")):
        raise HTTPException(403, "Only the person who assigned this task can request changes")

    in_progress_col_res = supabase.table("columns").select("id").eq("name", "In Progress").single().execute()
    if not in_progress_col_res.data:
        raise HTTPException(500, "'In Progress' column not found in database")

    supabase.table("cards").update({
        "column_id": in_progress_col_res.data["id"],
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(card_id)).execute()

    log_card_event(card_id=str(card_id), event_type="rejected", actor_id=str(current_user["id"]))

    if card.get("owner_id"):
        create_notification(
            user_id=card["owner_id"],
            notif_type="changes_requested",
            title=f"Changes were requested on \"{card['title']}\"",
            project_id=card["project_id"],
            card_id=str(card_id),
        )

    return {"status": "ok"}

@router.get("/{card_id}/events")
def get_card_events(card_id: UUID, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    card = _get_card_or_404(str(card_id))
    require_project_access(str(card["project_id"]), str(current_user["id"]))

    res = supabase.table("card_events").select(
        "*, "
        "actor:profiles!card_events_actor_id_fkey(id, email, full_name), "
        "from_column:columns!card_events_from_column_id_fkey(id, name), "
        "to_column:columns!card_events_to_column_id_fkey(id, name)"
    ).eq("card_id", str(card_id)).order("created_at", desc=True).execute()
    
    return res.data or []