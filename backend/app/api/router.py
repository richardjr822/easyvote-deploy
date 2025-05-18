from fastapi import APIRouter
from app.api.endpoints import auth, elections, organizations, candidates, students, votes, archives
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(elections.router, prefix="/elections", tags=["elections"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(votes.router, prefix="/votes", tags=["votes"])
api_router.include_router(archives.router, prefix="/archives", tags=["archives"])
