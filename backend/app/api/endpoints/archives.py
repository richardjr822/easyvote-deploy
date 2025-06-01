from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone
from app.db.database import supabase

router = APIRouter()

@router.get("/candidates")
async def get_archived_candidates(
    year: Optional[int] = None
):
    """Get archived candidates with optional filtering by year"""
    try:
        # Update the select to use correct table name - partylist (singular) instead of partylists
        query = supabase.table("candidates")\
            .select("id, name, position, organization_id, photo_url, created_at, is_archived, partylist_id, organizations(name), partylist(id, name)")\
            .eq("is_archived", True)
        
        # Apply year filter if provided
        if year:
            # Filter by created_at year
            start_date = f"{year}-01-01"
            end_date = f"{year+1}-01-01"
            query = query.gte("created_at", start_date).lt("created_at", end_date)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Get votes for each candidate
        result = []
        for candidate in response.data:
            # Get organization name
            org_name = candidate["organizations"]["name"] if candidate["organizations"] else "Unknown"
            
            # Get partylist name - changed to use partylist (singular)
            partylist_name = candidate["partylist"]["name"] if candidate["partylist"] else None
            
            # Count votes for this candidate
            votes_query = supabase.table("votes")\
                .select("id")\
                .eq("candidate_id", candidate["id"])\
                .execute()
            vote_count = len(votes_query.data) if votes_query.data else 0
            
            # Extract year from created_at
            created_at = candidate["created_at"]
            archived_year = datetime.fromisoformat(created_at.replace("Z", "+00:00")).year if created_at else None
            
            result.append({
                "archiveId": candidate["id"],
                "candidateId": candidate["id"],
                "name": candidate["name"],
                "group": org_name,
                "position": candidate["position"],
                "partylist_id": candidate["partylist_id"],
                "partylist": partylist_name,
                "archivedYear": archived_year,
                "createdAt": created_at,
                "votes": vote_count,
                "photoUrl": candidate["photo_url"]
            })
        
        return result
    
    except Exception as e:
        print(f"Error getting archived candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get archived candidates: {str(e)}")

@router.get("/statistics")
async def get_archive_statistics():
    """Get archive statistics"""
    try:
        # Get total archived candidates
        candidates_query = supabase.table("candidates")\
            .select("id, organization_id, created_at")\
            .eq("is_archived", True)\
            .execute()
        
        total_candidates = len(candidates_query.data)
        
        # Group candidates by organization
        candidates_by_org = {}
        for candidate in candidates_query.data:
            org_id = candidate["organization_id"]
            candidates_by_org[org_id] = candidates_by_org.get(org_id, 0) + 1
        
        # Get organization names
        org_names = {}
        for org_id in candidates_by_org.keys():
            org_query = supabase.table("organizations")\
                .select("id, name")\
                .eq("id", org_id)\
                .execute()
            
            if org_query.data:
                org_names[org_id] = org_query.data[0]["name"]
        
        # Format candidates by organization
        candidates_by_org_name = {}
        for org_id, count in candidates_by_org.items():
            name = org_names.get(org_id, "Unknown")
            candidates_by_org_name[name] = count
        
        # Get unique years
        years = set()
        for candidate in candidates_query.data:
            created_at = candidate.get("created_at")
            if created_at:
                year = datetime.fromisoformat(created_at.replace("Z", "+00:00")).year
                years.add(year)
        
        return {
            "totalCandidates": total_candidates,
            "candidates": candidates_by_org_name,
            "years": sorted(list(years), reverse=True)
        }
    
    except Exception as e:
        print(f"Error getting archive statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get archive statistics: {str(e)}")

# Add this new endpoint

@router.post("/unarchive/{candidate_id}")
async def unarchive_candidate(candidate_id: str):
    """Unarchive a previously archived candidate"""
    try:
        # Check if candidate exists
        candidate_check = supabase.table("candidates")\
            .select("id, name, is_archived")\
            .eq("id", candidate_id)\
            .execute()
        
        if not candidate_check.data:
            raise HTTPException(
                status_code=404,
                detail=f"Candidate with ID {candidate_id} not found"
            )
        
        # Update candidate to unarchive
        update_response = supabase.table("candidates")\
            .update({"is_archived": False})\
            .eq("id", candidate_id)\
            .execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to unarchive candidate"
            )
        
        # Return success response
        return {
            "success": True,
            "message": f"Candidate {candidate_check.data[0]['name']} unarchived successfully",
            "candidate_id": candidate_id
        }
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Error unarchiving candidate: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to unarchive candidate: {str(e)}"
        )