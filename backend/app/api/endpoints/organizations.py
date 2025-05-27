from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.db.database import supabase
from typing import Dict
from datetime import datetime, timedelta

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

@router.get("/")
async def get_organizations(token: str = Depends(oauth2_scheme)):
    try:
        org_names = [
            "CCS Student Council",
            "ELITES",
            "SPECS",
            "IMAGES"
        ]
        
        # First get all organizations
        orgs_resp = supabase.table("organizations")\
            .select("id, name, is_active")\
            .in_("name", org_names)\
            .execute()
        
        orgs = []
        if orgs_resp.data:
            for org in orgs_resp.data:
                # Get latest election for this organization
                election_resp = supabase.table("elections")\
                    .select("id, status, created_at, duration_hours")\
                    .eq("organization_id", org["id"])\
                    .order("created_at", desc=True)\
                    .limit(1)\
                    .execute()
                
                status = "not_started"
                end_time = None
                
                if election_resp.data and len(election_resp.data) > 0:
                    election = election_resp.data[0]
                    status = election["status"]
                    duration = election.get("duration_hours")
                    if status == "ongoing":
                        # Calculate end time based on duration
                        start_time = datetime.fromisoformat(election["created_at"])
                        end_time = (start_time + timedelta(hours=duration)).isoformat()
                    else:
                        end_time = None
                    orgs.append({
                        "name": org["name"],
                        "status": status,
                        "end_time": end_time,
                        "duration_hours": duration
                    })
                else:
                    orgs.append({
                        "name": org["name"],
                        "status": status,
                        "end_time": None,
                        "duration_hours": None
                    })
        
        # Add missing organizations with not_started status
        for name in org_names:
            if not any(o["name"] == name for o in orgs):
                orgs.append({
                    "name": name,
                    "status": "not_started",
                    "end_time": None,
                    "duration_hours": None
                })
        
        return orgs
    except Exception as e:
        print(f"Error in get_organizations: {str(e)}")
        # Return default structure on error
        return [
            {"name": name, "status": "not_started", "end_time": None, "duration_hours": None}
            for name in org_names
        ]

class StartElectionRequest(BaseModel):
    organization_name: str
    duration_hours: int
    eligible_voters: str

@router.post("/start")
async def start_election(
    req: StartElectionRequest,
    token: str = Depends(oauth2_scheme)
):
    allowed_orgs = [
        "CCS Student Council",
        "ELITES",
        "SPECS",
        "IMAGES"
    ]
    if req.organization_name not in allowed_orgs:
        raise HTTPException(status_code=400, detail="Invalid organization")

    # Enforce max 24 hours
    duration = min(req.duration_hours, 24)

    org_resp = supabase.table("organizations").select("id").eq("name", req.organization_name).single().execute()
    if not org_resp.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    org_id = org_resp.data["id"]

    # Set all ongoing elections for this org to finished
    supabase.table("elections").update({"status": "finished"}).eq("organization_id", org_id).eq("status", "ongoing").execute()

    # Create new election
    election_resp = supabase.table("elections").insert({
        "organization_id": org_id,
        "duration_hours": duration,
        "eligible_voters": req.eligible_voters,
        "status": "ongoing"
    }).execute()
    if not election_resp.data:
        raise HTTPException(status_code=500, detail="Failed to start election")

    # Set organization as active
    supabase.table("organizations").update({"is_active": True}).eq("id", org_id).execute()

    return {"status": "ongoing"}

@router.post("/new")
async def create_new_election(
    req: StartElectionRequest,
    token: str = Depends(oauth2_scheme)
):
    """Create a new election and archive all candidates from previous election"""
    allowed_orgs = [
        "CCS Student Council",
        "ELITES",
        "SPECS",
        "IMAGES"
    ]
    if req.organization_name not in allowed_orgs:
        raise HTTPException(status_code=400, detail="Invalid organization")

    # Enforce max 24 hours
    duration = min(req.duration_hours, 24)

    # Get organization ID
    org_resp = supabase.table("organizations").select("id").eq("name", req.organization_name).single().execute()
    if not org_resp.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    org_id = org_resp.data["id"]

    # Archive all candidates from the previous election
    archive_resp = supabase.table("candidates").update({"is_archived": True}).eq("organization_id", org_id).eq("is_archived", False).execute()
    
    # Create new election
    election_resp = supabase.table("elections").insert({
        "organization_id": org_id,
        "duration_hours": duration,
        "eligible_voters": req.eligible_voters,
        "status": "not_started"  # Set to not_started initially
    }).execute()

    if not election_resp.data:
        raise HTTPException(status_code=500, detail="Failed to create new election")

    return {"status": "created", "message": "New election created and previous candidates archived"}

@router.get("/by-name/{name}")
async def get_organization_by_name(name: str, token: str = Depends(oauth2_scheme)):
    try:
        org_resp = supabase.table("organizations")\
            .select("id, name")\
            .eq("name", name)\
            .single()\
            .execute()
        
        if not org_resp.data:
            raise HTTPException(status_code=404, detail=f"Organization '{name}' not found")
        
        return org_resp.data
    except Exception as e:
        print(f"Error in get_organization_by_name: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))