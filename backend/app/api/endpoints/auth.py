from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.core.config import settings
from app.core.security import verify_password, create_access_token, get_password_hash
from app.db.database import supabase
from app.models.schemas import Token, UserLogin, StudentCreate, AdminCreate

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, request: Request):
    # Add debug logging to track the request
    print(f"Login attempt: {user_data.user_type} - ID: {user_data.student_no if user_data.user_type == 'student' else user_data.username}")
    
    # Get client IP for login attempt logging
    client_ip = request.client.host
    
    # Authenticate based on user type
    if user_data.user_type == "student":
        # For students, use student_no instead of username
        response = supabase.table("students").select("*").eq("student_no", user_data.student_no).execute()
        print(f"Student query result: {response.data}")
        user = response.data[0] if response.data else None
    else:
        # For admins, use username
        response = supabase.table("administrators").select("*").eq("username", user_data.username).execute()
        print(f"Admin query result: {response.data}")
        user = response.data[0] if response.data else None
    
    # If no user found, return error
    if not user:
        print("User not found")
        # Try to record failed login attempt with error handling for RLS issues
        try:
            supabase.table("login_attempts").insert({
                "username": user_data.student_no if user_data.user_type == "student" else user_data.username,
                "ip_address": client_ip,
                "success": False,
                "user_type": user_data.user_type
            }).execute()
        except Exception as e:
            print(f"Failed to log login attempt: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    print(f"Checking password for user: {user.get('first_name')} {user.get('last_name')}")
    print(f"Stored hash: {user['password_hash']}")
    
    password_valid = verify_password(user_data.password, user["password_hash"])
    print(f"Password verification result: {password_valid}")
    
    if not password_valid:
        # Try to record failed login attempt with error handling for RLS issues
        try:
            supabase.table("login_attempts").insert({
                "username": user_data.student_no if user_data.user_type == "student" else user_data.username,
                "ip_address": client_ip,
                "success": False,
                "user_type": user_data.user_type
            }).execute()
        except Exception as e:
            print(f"Failed to log login attempt: {e}")
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Record successful login with error handling
    try:
        supabase.table("login_attempts").insert({
            "username": user_data.student_no if user_data.user_type == "student" else user_data.username,
            "ip_address": client_ip,
            "success": True,
            "user_type": user_data.user_type
        }).execute()
    except Exception as e:
        print(f"Failed to log successful login (but continuing): {e}")
    
    # Generate token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user["id"], 
        user_type=user_data.user_type,
        expires_delta=access_token_expires
    )
    
    # Prepare response data based on user type
    response_data = {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": user_data.user_type,
        "user_id": user["id"],
        "full_name": f"{user.get('first_name', '')} {user.get('last_name', '')}"
    }
    
    # Add student_no for student users
    if user_data.user_type == "student":
        response_data["student_no"] = user["student_no"]
    else:
        response_data["username"] = user["username"]
    
    print("Login successful!")
    return response_data    