from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer
from app.db.database import supabase
from typing import Dict, List, Optional
import uuid
import datetime
import os
import shutil
from pathlib import Path

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Define the upload directory with absolute path to avoid path issues
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "candidates"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/with-position")
async def create_candidate_with_position(
    name: str = Form(...),
    position: str = Form(...),
    organization_id: str = Form(...),
    photo: UploadFile = File(...),
    token: str = Depends(oauth2_scheme)
):
    try:
        # Standardize name to uppercase
        name = name.strip().upper()
        
        # Validate that the organization exists
        org_resp = supabase.table("organizations").select("name").eq("id", organization_id).execute()
        if not org_resp.data:
            raise HTTPException(status_code=404, detail=f"Organization not found: {organization_id}")
        
        # Check for duplicates - same name in same position
        duplicate_position = supabase.table("candidates") \
            .select("id") \
            .eq("name", name) \
            .eq("position", position) \
            .eq("organization_id", organization_id) \
            .eq("is_archived", False) \
            .execute()
            
        if duplicate_position.data and len(duplicate_position.data) > 0:
            raise HTTPException(
                status_code=409, 
                detail=f"A candidate named '{name}' already exists for the position of {position} in this organization"
            )
            
        # Check for duplicates - same name in same organization (any position)
        duplicate_org = supabase.table("candidates") \
            .select("id, position") \
            .eq("name", name) \
            .eq("organization_id", organization_id) \
            .eq("is_archived", False) \
            .execute()
            
        if duplicate_org.data and len(duplicate_org.data) > 0:
            existing_position = duplicate_org.data[0]["position"]
            raise HTTPException(
                status_code=409, 
                detail=f"A candidate named '{name}' already exists in this organization (position: {existing_position})"
            )
        
        # Generate a unique filename for the photo
        photo_ext = os.path.splitext(photo.filename)[1].lower()
        if photo_ext not in ['.jpg', '.jpeg', '.png', '.gif']:
            raise HTTPException(status_code=400, detail="Only JPG, PNG and GIF files are allowed")
            
        unique_filename = f"{uuid.uuid4()}{photo_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save the uploaded file
        try:
            with open(file_path, "wb") as buffer:
                content = await photo.read()  # Read file asynchronously
                buffer.write(content)
        except Exception as e:
            print(f"File write error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        # Construct the URL for the saved photo
        photo_url = f"/uploads/candidates/{unique_filename}"
        
        # Get current timestamp
        created_at = datetime.datetime.now().isoformat()
        
        # Create a new candidate record
        candidate_data = {
            "name": name,
            "position": position,
            "organization_id": organization_id,
            "photo_url": photo_url,
            "is_archived": False,
            "created_at": created_at
        }
        
        # Insert into the database
        try:
            candidate_resp = supabase.table("candidates").insert(candidate_data).execute()
            if not candidate_resp.data:
                raise Exception("No data returned from insert operation")
        except Exception as e:
            print(f"Database error: {str(e)}")
            # Delete the uploaded file if database operation fails
            if file_path.exists():
                os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
        # Add group information to response
        response_data = candidate_resp.data[0]
        response_data["group"] = org_resp.data[0]["name"] if org_resp.data else "Unknown"
        
        print(f"Candidate created successfully: {response_data}")
        return response_data
    
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        print(f"Error in create_candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating candidate: {str(e)}")

# Add this new endpoint for archiving candidates
@router.put("/{candidate_id}/archive")
async def archive_candidate(
    candidate_id: str,
    token: str = Depends(oauth2_scheme)
):
    try:
        # Check if candidate exists
        candidate_resp = supabase.table("candidates").select("*").eq("id", candidate_id).execute()
        if not candidate_resp.data or len(candidate_resp.data) == 0:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Update the is_archived flag
        archive_resp = supabase.table("candidates")\
            .update({"is_archived": True})\
            .eq("id", candidate_id)\
            .execute()
        
        if not archive_resp.data:
            raise HTTPException(status_code=500, detail="Failed to archive candidate")
        
        return {"message": "Candidate archived successfully"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error archiving candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# Add this endpoint for archiving all candidates
@router.put("/archive-all")
async def archive_all_candidates(token: str = Depends(oauth2_scheme)):
    try:
        # Update all non-archived candidates
        archive_resp = supabase.table("candidates")\
            .update({"is_archived": True})\
            .eq("is_archived", False)\
            .execute()
        
        return {"message": "All candidates archived successfully"}
    
    except Exception as e:
        print(f"Error archiving all candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# Update the get_recent_candidates to only show non-archived candidates
@router.get("/recent")
async def get_recent_candidates(token: str = Depends(oauth2_scheme)):
    try:
        # Get the 10 most recently created candidates that are not archived
        candidates_resp = supabase.table("candidates")\
            .select("id, name, position, organization_id, photo_url, created_at, organizations(name)")\
            .eq("is_archived", False)\
            .order("created_at", desc=True)\
            .limit(10)\
            .execute()
        
        if not candidates_resp.data:
            return []
        
        # Format response for frontend
        candidates = []
        for c in candidates_resp.data:
            candidate = {
                "id": c["id"],
                "name": c["name"],
                "position": c["position"],
                "photo_url": c["photo_url"],
                "created_at": c["created_at"],
                "group": c["organizations"]["name"] if c["organizations"] else "Unknown"
            }
            candidates.append(candidate)
        
        return candidates
    
    except Exception as e:
        print(f"Error in get_recent_candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add an endpoint to get all active candidates
@router.get("/")
async def get_all_candidates(token: str = Depends(oauth2_scheme)):
    try:
        # Get all non-archived candidates
        candidates_resp = supabase.table("candidates")\
            .select("id, name, position, organization_id, photo_url, created_at, organizations(name)")\
            .eq("is_archived", False)\
            .order("name", desc=False)\
            .execute()
        
        if not candidates_resp.data:
            return []
        
        # Format response for frontend
        candidates = []
        for c in candidates_resp.data:
            candidate = {
                "id": c["id"],
                "name": c["name"],
                "position": c["position"],
                "photo_url": c["photo_url"],
                "created_at": c["created_at"],
                "group": c["organizations"]["name"] if c["organizations"] else "Unknown"
            }
            candidates.append(candidate)
        
        return candidates
    
    except Exception as e:
        print(f"Error in get_all_candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{candidate_id}")
async def update_candidate(
    candidate_id: str,
    name: str = Form(...),
    position: str = Form(...),
    organization_id: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    token: str = Depends(oauth2_scheme)
):
    try:
        # Standardize name to uppercase
        name = name.strip().upper()
        
        # Check if candidate exists
        candidate_resp = supabase.table("candidates").select("*").eq("id", candidate_id).execute()
        if not candidate_resp.data or len(candidate_resp.data) == 0:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Prepare update data
        update_data = {
            "name": name,
            "position": position,
            "organization_id": organization_id
        }
        
        # If a new photo is uploaded, process it
        if photo and photo.filename:
            # Generate a unique filename for the photo
            photo_ext = os.path.splitext(photo.filename)[1].lower()
            if photo_ext not in ['.jpg', '.jpeg', '.png', '.gif']:
                raise HTTPException(status_code=400, detail="Only JPG, PNG and GIF files are allowed")
                
            unique_filename = f"{uuid.uuid4()}{photo_ext}"
            file_path = UPLOAD_DIR / unique_filename
            
            # Save the uploaded file
            with open(file_path, "wb") as buffer:
                content = await photo.read()
                buffer.write(content)
            
            # Update photo URL in database
            photo_url = f"/uploads/candidates/{unique_filename}"
            update_data["photo_url"] = photo_url
        
        # Update the candidate in the database
        update_resp = supabase.table("candidates")\
            .update(update_data)\
            .eq("id", candidate_id)\
            .execute()
        
        if not update_resp.data:
            raise HTTPException(status_code=500, detail="Failed to update candidate")
        
        # Get the organization name for the response
        org_resp = supabase.table("organizations").select("name").eq("id", organization_id).execute()
        org_name = org_resp.data[0]["name"] if org_resp.data else "Unknown"
        
        # Prepare response with organization name
        response_data = update_resp.data[0]
        response_data["group"] = org_name
        
        return response_data
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error updating candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")