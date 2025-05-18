from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List
from app.db.database import supabase
from datetime import datetime
import jwt
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class VoteItem(BaseModel):
    election_id: str
    candidate_id: str
    position: str  # Keep this for frontend compatibility

class VoteSubmission(BaseModel):
    election_id: str
    votes: List[VoteItem]
    student_id: str

@router.post("/submit")
async def submit_votes(
    vote_data: VoteSubmission
):
    try:
        # Use student_id directly from request payload
        student_id = vote_data.student_id
        print(f"Processing vote for student ID: {student_id}")
        
        # Check if user has already voted in this election
        existing_vote = supabase.table("votes")\
            .select("id")\
            .eq("election_id", vote_data.election_id)\
            .eq("student_id", student_id)\
            .execute()
        
        if existing_vote.data:
            raise HTTPException(
                status_code=400, 
                detail="You have already voted in this election"
            )
        
        # Verify the election is ongoing
        election_resp = supabase.table("elections")\
            .select("status")\
            .eq("id", vote_data.election_id)\
            .single()\
            .execute()
        
        if not election_resp.data:
            raise HTTPException(status_code=404, detail="Election not found")
        
        if election_resp.data["status"] != "ongoing":
            raise HTTPException(
                status_code=400, 
                detail="This election is not currently active"
            )
        
        # Record the votes
        timestamp = datetime.now().isoformat()
        vote_records = []
        
        # Remove the 'position' field when creating records for database insertion
        for vote in vote_data.votes:
            vote_records.append({
                "election_id": vote_data.election_id,
                "candidate_id": vote.candidate_id,
                "student_id": student_id,
                # Remove the position field since it doesn't exist in the database
                "created_at": timestamp
            })
        
        # Insert all votes in a batch
        if vote_records:
            votes_resp = supabase.table("votes").insert(vote_records).execute()
            if not votes_resp.data:
                raise HTTPException(
                    status_code=500, 
                    detail="Failed to record votes"
                )
        
        return {"message": "Votes submitted successfully"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error submitting votes: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error recording votes: {str(e)}"
        )

# Add this endpoint if you haven't already

@router.get("/check-voted")
async def check_if_voted(
    election_id: str,
    student_id: str,
    token: str = Depends(oauth2_scheme)
):
    """Check if a student has already voted in a specific election"""
    try:
        # Query existing votes
        existing_vote = supabase.table("votes")\
            .select("id")\
            .eq("election_id", election_id)\
            .eq("student_id", student_id)\
            .execute()
        
        # Log the result for debugging
        has_voted = len(existing_vote.data) > 0
        print(f"Check if student {student_id} has voted in election {election_id}: {has_voted}")
        
        return {
            "has_voted": has_voted,
            "election_id": election_id,
            "student_id": student_id
        }
    
    except Exception as e:
        print(f"Error checking vote status: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error checking vote status: {str(e)}"
        )

@router.get("/receipt")
async def get_vote_receipt(
    election_id: str,
    student_id: str,
    token: str = Depends(oauth2_scheme)
):
    """Get a receipt of a student's votes for a specific election"""
    try:
        # First check if the student has voted
        existing_vote = supabase.table("votes")\
            .select("id")\
            .eq("election_id", election_id)\
            .eq("student_id", student_id)\
            .execute()
        
        if not existing_vote.data:
            raise HTTPException(
                status_code=404, 
                detail="No votes found for this election"
            )
        
        # Get the candidate details for each vote
        votes_with_details = supabase.table("votes")\
            .select("votes.id, votes.candidate_id, candidates.name as candidate_name, candidates.position, candidates.party, candidates.image_url as candidate_image")\
            .eq("votes.election_id", election_id)\
            .eq("votes.student_id", student_id)\
            .join("candidates", "votes.candidate_id", "candidates.id")\
            .execute()
        
        # Format the vote data for the receipt
        formatted_votes = []
        for vote in votes_with_details.data:
            formatted_votes.append({
                "position": vote["position"],
                "candidate_name": vote["candidate_name"],
                "party": vote["party"],
                "candidate_image": vote["candidate_image"]
            })
        
        return {
            "election_id": election_id,
            "student_id": student_id,
            "timestamp": datetime.now().isoformat(),
            "votes": formatted_votes
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error getting vote receipt: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving vote receipt: {str(e)}"
        )

# Keep these functions for other authenticated endpoints
async def fetch_student_from_token(auth_header):
    """Helper function to get student info from token"""
    try:
        # Call the /students/me endpoint
        response = await fetch_from_api("/api/v1/students/me", auth_header)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Could not authenticate user: {str(e)}"
        )

async def fetch_from_api(endpoint, auth_header):
    """
    Helper function to make authenticated internal API calls
    In a real implementation, this would use httpx or another HTTP client,
    but for simplicity, we're using Supabase directly
    """
    # Extract token
    token = auth_header.replace("Bearer ", "")
    
    # Decode token to get student_no
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    student_no = payload.get("sub")
    
    if not student_no:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Query student directly
    student_resp = supabase.table("students")\
        .select("*")\
        .eq("student_no", student_no)\
        .single()\
        .execute()
    
    if not student_resp.data:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return student_resp.data