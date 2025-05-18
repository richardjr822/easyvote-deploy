from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from app.core.config import settings
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid
from datetime import datetime
from app.db.database import supabase
from app.core.logging import logger

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class StudentBase(BaseModel):
    student_no: str
    first_name: str
    last_name: str
    program: str
    year_level: str
    block: str

class StudentUpdate(StudentBase):
    pass

class StudentInDB(StudentBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class StudentResponse(StudentBase):
    id: uuid.UUID
    fullName: Optional[str] = None

@router.get("", response_model=List[StudentResponse])
async def get_all_students():
    """
    Get all students.
    """
    try:
        # Query all students from the database
        response = supabase.table("students").select("*").execute()
        
        if not response.data:
            return []
        
        # Transform the data to include fullName
        students = []
        for student in response.data:
            # Create fullName field and exclude password_hash
            student_data = {
                "id": student["id"],
                "student_no": student["student_no"],
                "first_name": student["first_name"],
                "last_name": student["last_name"],
                "program": student["program"],
                "year_level": student["year_level"],
                "block": student["block"],
                "fullName": f"{student['first_name']} {student['last_name']}".upper()
            }
            students.append(student_data)
        
        return students
        
    except Exception as e:
        logger.error(f"Error getting students: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving students: {str(e)}"
        )

@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: str, 
    student_update: StudentUpdate
):
    """
    Update a student's information.
    Does not update password.
    """
    try:
        # Check if student exists
        student_check = supabase.table("students").select("*").eq("id", student_id).execute()
        if not student_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Check if the program is valid
        valid_programs = ["BSIT", "BSCS", "BSEMC"]
        if student_update.program not in valid_programs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid program. Must be one of: {', '.join(valid_programs)}"
            )
        
        # Check if student_no is unique (if it has changed)
        if student_update.student_no != student_check.data[0]["student_no"]:
            student_no_check = supabase.table("students").select("id").eq("student_no", student_update.student_no).execute()
            if student_no_check.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Student number already exists"
                )
        
        # Update the student
        update_data = {
            "first_name": student_update.first_name,
            "last_name": student_update.last_name,
            "student_no": student_update.student_no,
            "program": student_update.program,
            "year_level": student_update.year_level,
            "block": student_update.block,
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase.table("students").update(update_data).eq("id", student_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update student"
            )
        
        # Format the response
        updated_student = response.data[0]
        return {
            "id": updated_student["id"],
            "student_no": updated_student["student_no"],
            "first_name": updated_student["first_name"],
            "last_name": updated_student["last_name"],
            "program": updated_student["program"],
            "year_level": updated_student["year_level"],
            "block": updated_student["block"],  # Remove the extra space after "block"
            "fullName": f"{updated_student['first_name']} {updated_student['last_name']}".upper()
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating student: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating student: {str(e)}"
        )

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student_by_id(student_id: str, request: Request):
    """
    Get a specific student by ID.
    Special case: When student_id is 'me', returns the currently authenticated student.
    """
    try:
        # Special case for "me" - get the current user from token
        if student_id == "me":
            # Extract the token from the Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            token = auth_header.replace("Bearer ", "")
            
            try:
                # Decode the token to get the user ID
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                student_id = payload.get("sub")  # Use the ID from the token
                
                if not student_id:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authentication credentials"
                    )
            except jwt.PyJWTError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token"
                )
        
        # Query the student with the ID (either from URL or token)
        response = supabase.table("students").select("*").eq("id", student_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Format the response
        student = response.data[0]
        return {
            "id": student["id"],
            "student_no": student["student_no"],
            "first_name": student["first_name"],
            "last_name": student["last_name"],
            "program": student["program"],
            "year_level": student["year_level"],
            "block": student["block"],
            "fullName": f"{student['first_name']} {student['last_name']}".upper()
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting student: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving student: {str(e)}"
        )