from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
async def tests():
    return["bombo"]