from fastapi import APIRouter, Depends, HTTPException, Response, Body, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.db.database import supabase
from typing import Dict, Optional
from datetime import datetime, timedelta, timezone

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class StartElectionRequest(BaseModel):
    organization_name: str
    duration_hours: int
    eligible_voters: str

class StopElectionRequest(BaseModel):
    organization_name: str

class NewElectionRequest(BaseModel):
    organization_name: str
    duration_hours: int
    eligible_voters: str

# Update the get_election_status function to handle timezone-aware datetimes properly
def get_election_status(election: dict) -> str:
    """Determine the current status of an election based on its data."""
    if election["status"] == "finished":
        return "finished"
    
    if election["status"] == "ongoing":
        # Parse start_time and ensure it has timezone info
        start_time = datetime.fromisoformat(election["created_at"])
        
        # If start_time is naive, add timezone (UTC)
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        
        # Calculate end_time with the same timezone
        end_time = start_time + timedelta(hours=election["duration_hours"])
        
        # Get current time with the same timezone
        now = datetime.now(timezone.utc)
        
        if now > end_time:
            return "finished"
        return "ongoing"
    
    return "not_started"

def validate_election_eligibility(organization_name: str) -> None:
    """Validate if an election can be started for an organization."""
    # Check if organization exists and is valid
    org_resp = supabase.table("organizations").select("id, is_active").eq("name", organization_name).single().execute()
    if not org_resp.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if there's already an ongoing election
    elections_resp = supabase.table("elections")\
        .select("id, status, created_at, duration_hours")\
        .eq("organization_id", org_resp.data["id"])\
        .eq("status", "ongoing")\
        .execute()
    
    if elections_resp.data:
        raise HTTPException(status_code=400, detail="An election is already ongoing for this organization")

def auto_finish_expired_elections():
    """
    This function checks all ongoing elections and finishes those whose timer has expired.
    Should be called before returning election status or statistics.
    """
    try:
        # Philippine Timezone (UTC+8)
        PHT = timezone(timedelta(hours=8))
        ongoing_resp = supabase.table("elections")\
            .select("id, organization_id, created_at, duration_hours, status")\
            .eq("status", "ongoing")\
            .execute()
        now = datetime.now(PHT)
        if ongoing_resp.data:
            for election in ongoing_resp.data:
                # Parse created_at as aware datetime in PHT
                start_time = datetime.fromisoformat(election["created_at"])
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=PHT)
                else:
                    start_time = start_time.astimezone(PHT)
                end_time = start_time + timedelta(hours=election["duration_hours"])
                if now >= end_time:
                    # Set election as finished
                    supabase.table("elections")\
                        .update({"status": "finished"})\
                        .eq("id", election["id"])\
                        .execute()
                    # Set organization as inactive
                    supabase.table("organizations")\
                        .update({"is_active": False})\
                        .eq("id", election["organization_id"])\
                        .execute()
    except Exception as e:
        print(f"Error in auto_finish_expired_elections: {str(e)}")

@router.get("/statistics")
async def get_election_statistics(token: str = Depends(oauth2_scheme)) -> Dict:
    auto_finish_expired_elections()
    try:
        # Get total eligible voters
        voters_resp = supabase.table("students").select("id, program").execute()
        total_voters = len(voters_resp.data) if voters_resp.data else 0
        
        # Count voters by program for eligibility calculation
        voters_by_program = {"BSIT": 0, "BSCS": 0, "BSEMC": 0}
        if voters_resp.data:
            for voter in voters_resp.data:
                program = voter["program"]
                if program in voters_by_program:
                    voters_by_program[program] += 1
        
        # Get candidates by organization
        candidates_by_org = {
            "CCS Student Council": 0,
            "ELITES": 0,
            "SPECS": 0,
            "IMAGES": 0
        }
        
        candidates_resp = supabase.table("candidates")\
            .select("organization_id, organizations(name)")\
            .eq("is_archived", False)\
            .execute()
        
        if candidates_resp.data:
            for candidate in candidates_resp.data:
                org_name = candidate["organizations"]["name"]
                if org_name in candidates_by_org:
                    candidates_by_org[org_name] += 1
        
        # Get organization-specific vote counts
        org_voted_counts = {
            "CCS Student Council": 0,
            "ELITES": 0,
            "SPECS": 0,
            "IMAGES": 0
        }
        
        # Get all active elections with their organization info
        active_elections_resp = supabase.table("elections")\
            .select("id, organization_id, organizations(name)")\
            .eq("status", "ongoing")\
            .execute()
        
        if active_elections_resp.data:
            for election in active_elections_resp.data:
                org_name = election["organizations"]["name"]
                election_id = election["id"]
                
                # Count unique voters for this specific election
                votes_resp = supabase.table("votes")\
                    .select("student_id")\
                    .eq("election_id", election_id)\
                    .execute()
                
                # Get unique student IDs who voted in this election
                unique_voters = set()
                if votes_resp.data:
                    for vote in votes_resp.data:
                        unique_voters.add(vote["student_id"])
                
                if org_name in org_voted_counts:
                    org_voted_counts[org_name] = len(unique_voters)
        
        # Get votes by program for overall statistics
        voted_by_program = {"BSIT": 0, "BSCS": 0, "BSEMC": 0}
        
        if active_elections_resp.data:
            election_ids = [e["id"] for e in active_elections_resp.data]
            
            # Get all votes for active elections with student program info
            votes_resp = supabase.table("votes")\
                .select("student_id, students(program)")\
                .in_("election_id", election_ids)\
                .execute()
            
            # Track unique voters per program across all active elections
            program_voters = {"BSIT": set(), "BSCS": set(), "BSEMC": set()}
            
            if votes_resp.data:
                for vote in votes_resp.data:
                    program = vote["students"]["program"]
                    student_id = vote["student_id"]
                    if program in program_voters:
                        program_voters[program].add(student_id)
            
            # Convert sets to counts
            for program in voted_by_program:
                voted_by_program[program] = len(program_voters[program])
        
        return {
            "totalVoters": total_voters,
            "candidates": candidates_by_org,
            "voted": voted_by_program,
            "votersByProgram": voters_by_program,
            "orgVoted": org_voted_counts,
            "orgVoters": {
                "CCS Student Council": total_voters,  # All students can vote for CCS SC
                "ELITES": voters_by_program["BSIT"],  # Only BSIT for ELITES
                "SPECS": voters_by_program["BSCS"],   # Only BSCS for SPECS
                "IMAGES": voters_by_program["BSEMC"] # Only BSEMC for IMAGES
            }
        }
    except Exception as e:
        print(f"Error in get_election_statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get election statistics")

@router.post("/start")
async def start_election(
    req: StartElectionRequest,
    token: str = Depends(oauth2_scheme),
    response: Response = None
):
    try:
        # Add CORS headers
        if response:
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
        
        # Validate organization
        allowed_orgs = ["CCS Student Council", "ELITES", "SPECS", "IMAGES"]
        if req.organization_name not in allowed_orgs:
            raise HTTPException(status_code=400, detail="Invalid organization")
        
        # Validate election eligibility
        validate_election_eligibility(req.organization_name)
        
        # Enforce max 24 hours
        duration = min(req.duration_hours, 24)
        
        # Get organization ID
        org_resp = supabase.table("organizations").select("id").eq("name", req.organization_name).single().execute()
        org_id = org_resp.data["id"]
        
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
        
        return {"status": "ongoing", "message": "Election started successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in start_election: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start election")

@router.post("/stop")
async def stop_election(
    req: StopElectionRequest,
    token: str = Depends(oauth2_scheme),
    response: Response = None
):
    try:
        # Add CORS headers
        if response:
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
        
        # Validate organization
        allowed_orgs = ["CCS Student Council", "ELITES", "SPECS", "IMAGES"]
        if req.organization_name not in allowed_orgs:
            raise HTTPException(status_code=400, detail="Invalid organization")
        
        # Get organization ID
        org_resp = supabase.table("organizations").select("id").eq("name", req.organization_name).single().execute()
        if not org_resp.data:
            raise HTTPException(status_code=404, detail="Organization not found")
        org_id = org_resp.data["id"]
        
        # Get ongoing election
        election_resp = supabase.table("elections")\
            .select("id, created_at, duration_hours")\
            .eq("organization_id", org_id)\
            .eq("status", "ongoing")\
            .single()\
            .execute()
        
        if not election_resp.data:
            raise HTTPException(status_code=400, detail="No ongoing election found")
        
        # Calculate end time based on created_at and duration_hours
        start_time = datetime.fromisoformat(election_resp.data["created_at"])
        end_time = start_time + timedelta(hours=election_resp.data["duration_hours"])
        
        # Set election as finished
        supabase.table("elections")\
            .update({
                "status": "finished"
            })\
            .eq("id", election_resp.data["id"])\
            .execute()
        
        # Set organization as inactive
        supabase.table("organizations").update({"is_active": False}).eq("id", org_id).execute()
        
        return {
            "status": "finished",
            "message": "Election stopped successfully",
            "duration": election_resp.data["duration_hours"],
            "started_at": election_resp.data["created_at"],
            "ended_at": end_time.isoformat()
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in stop_election: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to stop election")

@router.get("/status/{organization_name}")
async def get_election_status_endpoint(
    organization_name: str,
    token: str = Depends(oauth2_scheme)
):
    auto_finish_expired_elections()
    try:
        # Get organization ID
        org_resp = supabase.table("organizations").select("id").eq("name", organization_name).single().execute()
        if not org_resp.data:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Get latest election
        election_resp = supabase.table("elections")\
            .select("id, status, created_at, duration_hours")\
            .eq("organization_id", org_resp.data["id"])\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        if not election_resp.data:
            return {"status": "not_started"}
        
        election = election_resp.data[0]
        status = get_election_status(election)
        
        response = {
            "status": status,
            "election_id": election["id"]
        }
        
        if status == "ongoing":
            # Parse start_time and ensure it has timezone info
            start_time = datetime.fromisoformat(election["created_at"])
            
            # If start_time is naive, add timezone (UTC)
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            
            # Calculate end_time with the same timezone
            end_time = start_time + timedelta(hours=election["duration_hours"])
            
            # Get current time with the same timezone
            now = datetime.now(timezone.utc)
            
            response["end_time"] = end_time.isoformat()
            response["remaining_time"] = (end_time - now).total_seconds()
        
        return response
    except Exception as e:
        print(f"Error in get_election_status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get election status: {str(e)}")

@router.post("/new")
async def create_new_election(
    req: NewElectionRequest = Body(...),
    token: str = Depends(oauth2_scheme),
    response: Response = None
):
    """
    Create a new election for an organization, regardless of previous elections.
    This is used for starting a new election cycle after a previous one has finished.
    """
    try:
        # Add CORS headers
        if response:
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"

        # Validate organization
        allowed_orgs = ["CCS Student Council", "ELITES", "SPECS", "IMAGES"]
        if req.organization_name not in allowed_orgs:
            raise HTTPException(status_code=400, detail="Invalid organization")

        # Enforce max 24 hours
        duration = min(req.duration_hours, 24)

        # Get organization ID
        org_resp = supabase.table("organizations").select("id").eq("name", req.organization_name).single().execute()
        if not org_resp.data:
            raise HTTPException(status_code=404, detail="Organization not found")
        org_id = org_resp.data["id"]

        # Create new election (status: not_started)
        election_resp = supabase.table("elections").insert({
            "organization_id": org_id,
            "duration_hours": duration,
            "eligible_voters": req.eligible_voters,
            "status": "not_started"
        }).execute()

        if not election_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create new election")

        # Set organization as inactive (since election is not started yet)
        supabase.table("organizations").update({"is_active": False}).eq("id", org_id).execute()

        return {"status": "not_started", "message": "New election created successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in create_new_election: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create new election")

# Add this to your elections.py file
@router.options("/start")
async def options_start(response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return {}

@router.get("/cors-test")
async def test_cors(response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return {"message": "CORS test successful"}

@router.options("/stop")
async def options_stop(response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return {}

@router.get("/results")
async def get_election_results(token: str = Depends(oauth2_scheme)):
    """
    Get election results with vote counts for all candidates.
    Returns data for both ongoing and finished elections to show live results.
    """
    try:
        # Auto-finish any expired elections first
        auto_finish_expired_elections()
        
        # Get all organizations
        orgs_resp = supabase.table("organizations").select("id, name").execute()
        if not orgs_resp.data:
            return []
        
        results = []
        
        # Process each organization
        for org in orgs_resp.data:
            org_id = org["id"]
            org_name = org["name"]
            
            # Get the most recent election for this organization (ongoing OR finished)
            election_resp = supabase.table("elections")\
                .select("id, status, created_at, duration_hours")\
                .eq("organization_id", org_id)\
                .in_("status", ["ongoing", "finished"])\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            # Skip if no election found
            if not election_resp.data:
                continue
                
            election = election_resp.data[0]
            election_id = election["id"]
            election_status = election["status"]
            
            # Get all candidates for this organization
            candidates_resp = supabase.table("candidates")\
                .select("id, name, position")\
                .eq("organization_id", org_id)\
                .eq("is_archived", False)\
                .execute()
            
            if not candidates_resp.data:
                continue
                
            # Group candidates by position
            positions_dict = {}
            for candidate in candidates_resp.data:
                position = candidate["position"]
                
                if position not in positions_dict:
                    positions_dict[position] = []
                
                # Get vote count for this candidate
                votes_resp = supabase.table("votes")\
                    .select("id")\
                    .eq("election_id", election_id)\
                    .eq("candidate_id", candidate["id"])\
                    .execute()
                
                vote_count = len(votes_resp.data) if votes_resp.data else 0
                
                # Add candidate with vote count
                positions_dict[position].append({
                    "name": candidate["name"],
                    "vote_count": vote_count
                })
            
            # Convert positions dictionary to list for the response
            positions_list = []
            for position_name, candidates in positions_dict.items():
                positions_list.append({
                    "name": position_name,
                    "candidates": candidates
                })
            
            # Calculate remaining time for ongoing elections
            remaining_time = None
            if election_status == "ongoing":
                start_time = datetime.fromisoformat(election["created_at"])
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
                
                end_time = start_time + timedelta(hours=election["duration_hours"])
                now = datetime.now(timezone.utc)
                
                if now < end_time:
                    remaining_time = (end_time - now).total_seconds()
            
            # Add organization results to the response
            results.append({
                "organization_id": org_id,
                "organization_name": org_name,
                "election_status": election_status,
                "remaining_time": remaining_time,
                "positions": positions_list
            })
        
        return results
    
    except Exception as e:
        print(f"Error getting election results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get election results: {str(e)}")