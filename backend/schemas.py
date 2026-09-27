from pydantic import BaseModel, ConfigDict, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional

class ColumnOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    position: int
    created_at: datetime

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    full_name: Optional[str]

# --- Project Schemas ---
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    description: Optional[str]
    owner_id: UUID
    created_at: datetime
    updated_at: datetime

# --- Project Member / Invitation Schemas ---
class ProjectMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    project_id: UUID
    user_id: UUID
    role: str
    status: str
    invited_by: Optional[UUID] = None
    joined_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserOut] = None

class ProjectInvitationOut(BaseModel):
    """A pending invitation, shown to the invited user (e.g. in the sidebar)."""
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    project_id: UUID
    project_name: str
    invited_by: Optional[UserOut] = None
    created_at: datetime

class InviteRequest(BaseModel):
    email: EmailStr

class InvitationActionRequest(BaseModel):
    action: str  # "accept" | "decline"

# --- Card Schemas ---
class CardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    column_id: UUID
    project_id: UUID  # REQUIRED
    owner_id: Optional[UUID] = None
    position: int = 0

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    column_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    position: Optional[int] = None

class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    description: Optional[str]
    column_id: UUID
    project_id: UUID
    owner_id: Optional[UUID]
    assigned_by: Optional[UUID]
    position: int
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

# --- Notification Schemas ---
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    type: str
    title: Optional[str] = None
    message: Optional[str] = None
    project_id: Optional[UUID] = None
    card_id: Optional[UUID] = None
    is_read: bool = False  # Changed from 'read' to 'is_read'
    metadata: Optional[dict] = None
    created_at: datetime