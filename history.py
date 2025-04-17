from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os

router = APIRouter()

# 定义静态文件路径（与 main.py 保持一致）
IMAGE_DIR = os.path.join("static", "uploaded_images")  # 修改为 uploaded_images
VIDEO_DIR = os.path.join("static", "uploaded_videos")
ZIP_DIR = os.path.join("static", "zip_files")

def list_files_in_directory(directory: str):
    """获取目录下的所有文件名"""
    if not os.path.exists(directory):
        return []
    return [{"name": file} for file in os.listdir(directory) if os.path.isfile(os.path.join(directory, file))]

@router.get("/files/images")
async def get_image_files():
    return JSONResponse(content=list_files_in_directory(IMAGE_DIR))

@router.get("/files/videos")
async def get_video_files():
    return JSONResponse(content=list_files_in_directory(VIDEO_DIR))

@router.get("/files/zip")
async def get_zip_files():
    return JSONResponse(content=list_files_in_directory(ZIP_DIR))