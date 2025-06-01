from fastapi import APIRouter, Depends, HTTPException, Response, Body, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, UUID4
from app.db.database import supabase
from typing import Dict, Optional, List
from datetime import datetime, timedelta, timezone
from uuid import UUID

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ---- Schemas ----
class PartylistBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class PartylistCreate(PartylistBase):
    pass

class PartylistUpdate(PartylistBase):
    pass

class PartylistResponse(PartylistBase):
    id: UUID4
    is_archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ---- Routes ----
@router.get("/", response_model=List[PartylistResponse])
async def get_partylists(token: Optional[str] = Depends(oauth2_scheme)):
    """Get all active partylists"""
    try:
        partylists_resp = supabase.table("partylist") \
            .select("id, name, is_archived, created_at, updated_at") \
            .eq("is_archived", False) \
            .order("name") \
            .execute()
        
        return partylists_resp.data
    except Exception as e:
        print(f"Error fetching partylists: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch partylists")

@router.post("/", response_model=PartylistResponse, status_code=201)
async def create_partylist(
    partylist: PartylistCreate,
    token: Optional[str] = Depends(oauth2_scheme)
):
    """Create a new partylist"""
    try:
        # Check if exists
        existing_resp = supabase.table("partylist") \
            .select("id") \
            .ilike("name", partylist.name.strip()) \
            .execute()
        
        if existing_resp.data and len(existing_resp.data) > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Partylist with name '{partylist.name}' already exists"
            )
        
        # Create new partylist
        new_partylist_resp = supabase.table("partylist") \
            .insert({
                "name": partylist.name.strip().upper(),
                "is_archived": False
            }) \
            .execute()
        
        if not new_partylist_resp.data or len(new_partylist_resp.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create partylist")
        
        return new_partylist_resp.data[0]
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error creating partylist: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create partylist: {str(e)}")

@router.put("/{partylist_id}", response_model=PartylistResponse)
async def update_partylist(
    partylist_id: UUID,
    partylist: PartylistUpdate,
    token: Optional[str] = Depends(oauth2_scheme)
):
    """Update a partylist"""
    try:
        # Check if partylist exists
        existing_resp = supabase.table("partylist") \
            .select("id") \
            .eq("id", str(partylist_id)) \
            .execute()
        
        if not existing_resp.data or len(existing_resp.data) == 0:
            raise HTTPException(status_code=404, detail="Partylist not found")
        
        # Check if new name conflicts
        name_check_resp = supabase.table("partylist") \
            .select("id") \
            .ilike("name", partylist.name.strip()) \
            .execute()
        
        if name_check_resp.data and len(name_check_resp.data) > 0:
            # Check if the found record is different from the one we're updating
            if name_check_resp.data[0]["id"] != str(partylist_id):
                raise HTTPException(
                    status_code=400,
                    detail=f"Partylist with name '{partylist.name}' already exists"
                )
        
        # Update partylist
        updated_resp = supabase.table("partylist") \
            .update({
                "name": partylist.name.strip().upper()
                # updated_at is handled by your trigger
            }) \
            .eq("id", str(partylist_id)) \
            .execute()
        
        if not updated_resp.data or len(updated_resp.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to update partylist")
        
        return updated_resp.data[0]
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error updating partylist: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update partylist: {str(e)}")

@router.delete("/{partylist_id}", status_code=204)
async def delete_partylist(
    partylist_id: UUID,
    token: Optional[str] = Depends(oauth2_scheme)
):
    """Soft delete a partylist"""
    try:
        # Check if partylist exists
        existing_resp = supabase.table("partylist") \
            .select("id") \
            .eq("id", str(partylist_id)) \
            .execute()
        
        if not existing_resp.data or len(existing_resp.data) == 0:
            raise HTTPException(status_code=404, detail="Partylist not found")
        
        # Soft delete (archive)
        supabase.table("partylist") \
            .update({
                "is_archived": True
                # updated_at is handled by your trigger
            }) \
            .eq("id", str(partylist_id)) \
            .execute()
        
        return Response(status_code=204)
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error deleting partylist: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete partylist: {str(e)}")

@router.get("/candidates", response_model=List[Dict])
async def get_candidates(token: Optional[str] = Depends(oauth2_scheme)):
    """Get all candidates with their partylist details"""
    try:
        candidates_resp = supabase.table("candidates") \
            .select("id, name, position, partylist_id, partylist(id, name)") \
            .execute()
        
        return candidates_resp.data
    except Exception as e:
        print(f"Error fetching candidates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch candidates")