from fastapi import FastAPI, WebSocket, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from PIL import Image, ImageDraw, ImageFont
import uvicorn
import torch
import io
from ultralytics import YOLO
from fastapi.staticfiles import StaticFiles
import zipfile
import os
from datetime import datetime
import cv2
from typing import List
import asyncio
import platform
import requests
# from llama_cpp import Llama  # 注释掉 GGUF 相关导入
from pydantic import BaseModel
from pathlib import Path
import gc
from alert import router as alert_router
from history import router as history_router
from data_board import update_identify_file, update_warn_file
# from phonetic_trans import speech_router

# 异步生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    global model , gguf_model  
    try:
        os.makedirs("static/uploaded_images", exist_ok=True)
        os.makedirs("static/uploaded_videos", exist_ok=True)
        os.makedirs("static/zip_files", exist_ok=True)
        print("✅ zip_files, uploaded_images 和 uploaded_videos 目录已创建")

        # 加载YOLO模型
        model_path = r'best.pt'
        model = YOLO(model_path)
        model.to('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"✅ YOLO模型加载成功 | 设备: {model.device}")
        
        # 挂载静态文件路由
        app.mount("/static", StaticFiles(directory="static"), name="static")
        print("✅ 静态文件路由已加载")
        
        # 移除 gguf_model 相关代码，使用 Ollama API
        print("✅ Ollama API 已准备就绪")
        
        yield
    finally:
        if 'model' in globals():
            del model
            torch.cuda.empty_cache()
            print("🛑 YOLO模型资源已释放")

# 修改聊天接口
# 将 ChatRequest 类定义移到文件开头的导入部分
class ChatRequest(BaseModel):
    message: str

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 根据实际部署调整
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(history_router)

app.include_router(alert_router)

# app.include_router(speech_router)


@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Ollama API 配置
        ollama_url = "http://localhost:11434/api/generate"
        
        # 构建请求数据
        data = {
            "model": "DeepSeek-R1-Animal",
            "prompt": request.message,
            "stream": False
        }
        
        # 调用 Ollama API
        response = requests.post(ollama_url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            return {"response": result.get("response", "抱歉，无法获取回答")}
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail="Ollama API 调用失败"
            )
            
    except Exception as e:
        print(f"聊天接口错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")



# 支持的媒体类型
SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/bmp", "image/gif", "image/tiff", "image/webp"]
SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"]

# 根路由返回前端页面
@app.get("/")
def serve_frontend():
    return FileResponse("static/animal_pre.html")


# 定义文件目录
uploaded_images_dir = Path("uploaded_images")
uploaded_videos_dir = Path("uploaded_videos")
zip_files_dir = Path("zip_files")

# 获取文件列表函数
def get_files_in_directory(directory: Path, file_type: str):
    # 获取所有文件并按照名称排序
    files = sorted(directory.glob('*'), key=lambda f: f.name)
    file_list = []
    for file in files:
        if file.is_file():
            name = file.stem  # 文件名（不包括扩展名）
            file_list.append({
                'name': name,
                'type': file_type
            })
    return file_list

# API 路径：获取图片文件
@app.get("/files/images")
async def get_images(batch: str = None):
    files = get_files_in_directory(uploaded_images_dir, '图片')
    if batch:
        # 过滤出属于同一批次的文件
        files = [file for file in files if file['name'].startswith(batch)]
    return JSONResponse(content=files)

# API 路径：获取视频文件
@app.get("/files/videos")
async def get_videos():
    files = get_files_in_directory(uploaded_videos_dir, '视频')
    return JSONResponse(content=files)

# API 路径：获取压缩包文件
@app.get("/files/zip")
async def get_zip_files():
    files = get_files_in_directory(zip_files_dir, 'zip')
    return JSONResponse(content=files)



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            detections = await process_image(data)
            await websocket.send_json(detections)
    except ConnectionResetError:
        print("客户端断开连接")
    except Exception as e:
        print(f"发生错误: {e}")

async def process_image(image_bytes):
    """处理图像并返回检测结果"""
    image = Image.open(io.BytesIO(image_bytes))
    model_results = model.predict(image)
    detections = []
    detected_animals = []
    for result in model_results:
        for box in result.boxes:
            class_id = int(box.cls)
            class_name = model.names[class_id]
            confidence = float(box.conf)
            bbox = box.xyxy[0].tolist()
            detections.append({
                "class": class_name,
                "confidence": confidence,
                "bbox": bbox
            })
            detected_animals.append(class_name)
    
    try:
        update_identify_file(len(detections))
        update_warn_file(detected_animals)
    except Exception as e:
        print(f"更新文件时发生错误: {e}")
    
    return detections

def clean_old_files(save_dir: str, max_files: int = 1000):
    """删除最早保存的文件，确保文件夹中的文件数量不超过 max_files"""
    files = sorted(os.listdir(save_dir), key=lambda x: os.path.getmtime(os.path.join(save_dir, x)))
    while len(files) > max_files:
        os.remove(os.path.join(save_dir, files[0]))
        files.pop(0)
        print(f"🛑 删除最早保存的文件: {files[0]}")

def process_video(video_path: str, output_path: str) -> List[dict]:
    """处理视频并返回检测结果"""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"❌ 无法打开视频文件: {video_path}")
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # 创建视频写入器，使用 mp4v 编码器
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # 使用 mp4v 编码器
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    detections = []
    detected_animals = []
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # 转换颜色空间
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)

        # 执行推理
        model_results = model.predict(pil_image)

        # 绘制检测结果
        for result in model_results:
            for box in result.boxes:
                class_id = int(box.cls)
                class_name = model.names[class_id]
                confidence = float(box.conf)
                bbox = box.xyxy[0].tolist()

                # 转换为整数坐标
                x1, y1, x2, y2 = map(int, bbox)

                # 绘制边界框
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

                # 绘制标签和置信度
                label = f"{class_name} {confidence:.2f}"
                cv2.putText(frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

                detections.append({
                    "class": class_name,
                    "confidence": confidence,
                    "bbox": bbox
                })
                detected_animals.append(class_name)

        # 将帧写入输出视频
        out.write(frame)
        frame_count += 1

    cap.release()
    out.release()

    # # 更新识别数据和预警数据
    #update_identify_data(frame_count)
    #update_warn_data(detected_animals)

    return detections

@app.post("/detect/")
async def detect_files(files: List[UploadFile] = File(...)):
    """
    文件识别接口（支持图片和视频）
    参数：
    - files: 上传的文件列表（图片或视频）

    返回：
    - results: 识别结果列表
    - zip_url: 压缩包下载URL
    """
    try:
        image_dir = "static/uploaded_images"
        video_dir = "static/uploaded_videos"
        zip_dir = "static/zip_files"

        os.makedirs(image_dir, exist_ok=True)
        os.makedirs(video_dir, exist_ok=True)
        os.makedirs(zip_dir, exist_ok=True)

        results = []
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")  # 时间戳格式：年月日_时分秒
        zip_filename = f"{timestamp}.zip"  # 压缩包命名
        zip_path = os.path.join(zip_dir, zip_filename)

        with zipfile.ZipFile(zip_path, "w") as zipf:
            for index, file in enumerate(files, start=1):
                # 验证文件类型
                if file.content_type in SUPPORTED_IMAGE_TYPES:
                    # 处理图片
                    new_filename = f"{timestamp}_{index:03d}.jpg"
                    file_path = os.path.join(image_dir, new_filename)
                    file_url = f"/static/uploaded_images/{new_filename}"

                    # 读取并转换图片
                    image_bytes = await file.read()
                    image = Image.open(io.BytesIO(image_bytes))

                    # 执行推理
                    model_results = model.predict(image)

                    # 解析检测结果并标注在图片上
                    draw = ImageDraw.Draw(image)
                    try:
                        font = ImageFont.truetype("arial.ttf", size=80)
                    except:
                        font = ImageFont.load_default()
                    detections = []

                    for result in model_results:
                        for box in result.boxes:
                            class_id = int(box.cls)
                            class_name = model.names[class_id]
                            confidence = float(box.conf)
                            bbox = box.xyxy[0].tolist()

                            # 标注边界框
                            draw.rectangle(bbox, outline="red", width=2)

                            # 标注类别和置信度
                            label = f"{class_name} {confidence:.2f}"
                            text_position = (bbox[0], bbox[1] - 20)
                            draw.text(text_position, label, fill="white", font=font)

                            detections.append({
                                "class": class_name,
                                "confidence": confidence,
                                "bbox": bbox
                            })

                    # 保存为JPG格式
                    image.convert("RGB").save(file_path, "JPEG")
                    zipf.write(file_path, arcname=new_filename)

                    results.append({
                        "filename": new_filename,
                        "type": "image",
                        "detections": detections,
                        "url": file_url
                    })

                elif file.content_type in SUPPORTED_VIDEO_TYPES:
                    # 处理视频
                    new_filename = f"{timestamp}_{index:03d}.mp4"
                    temp_video_path = os.path.join(video_dir, f"temp_{new_filename}")
                    processed_video_path = os.path.join(video_dir, new_filename)
                    file_url = f"/static/uploaded_videos/{new_filename}"

                    # 保存临时视频文件
                    with open(temp_video_path, "wb") as buffer:
                        buffer.write(await file.read())

                    # 处理视频
                    detections = process_video(temp_video_path, processed_video_path)

                    # 删除临时文件
                    os.remove(temp_video_path)

                    # 添加处理后的视频到压缩包
                    zipf.write(processed_video_path, arcname=new_filename)

                    results.append({
                        "filename": new_filename,
                        "type": "video",
                        "detections": detections,
                        "url": file_url
                    })
                else:
                    results.append({
                        "filename": file.filename,
                        "error": f"不支持的文件类型: {file.content_type}"
                    })
                    continue

        # 清理旧文件
        clean_old_files(image_dir, max_files=1000)
        clean_old_files(video_dir, max_files=100)

        return {
            "results": results,
            "zip_url": f"/static/zip_files/{zip_filename}"
        }

    except Exception as e:
        print(f"❌ 处理失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"处理失败: {str(e)}"}
        )



# 根据当前操作系统设置事件循环策略
if platform.system() == "Windows":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


# 添加历史记录路由
@app.get("/api/history")
async def get_history():
    try:
        # 获取上传的图片和视频文件
        image_files = get_files_in_directory(Path("static/uploaded_images"), "图片")
        video_files = get_files_in_directory(Path("static/uploaded_videos"), "视频")
        
        # 合并并格式化历史记录
        history_records = []
        for idx, file in enumerate(image_files + video_files):
            history_records.append({
                "id": str(idx + 1),
                "batch": f"批次-{idx + 1}",
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "count": 1,
                "type": file["type"]
            })
            
        return history_records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/zip_files/{filename}")
async def get_zip_file(filename: str):
    zip_path = os.path.join("static", "zip_files", filename)
    if os.path.exists(zip_path):
        return FileResponse(
            path=zip_path,
            filename=filename,
            media_type='application/zip',
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Allow-Origin": "*"
            }
        )
    raise HTTPException(status_code=404, detail="文件不存在")


@app.get("/api/history/{record_id}/view")
async def view_history_record(record_id: str):
    try:
        # 获取所有文件
        image_files = get_files_in_directory(Path("static/uploaded_images"), "图片")
        video_files = get_files_in_directory(Path("static/uploaded_videos"), "视频")
        all_files = image_files + video_files
        
        # 查找对应的文件
        idx = int(record_id) - 1
        if 0 <= idx < len(all_files):
            file = all_files[idx]
            file_type = file["type"]
            file_name = file["name"]
            
            if file_type == "图片":
                file_path = f"static/uploaded_images/{file_name}.jpg"
                if os.path.exists(file_path):
                    return {
                        "type": file_type,
                        "url": f"/static/uploaded_images/{file_name}.jpg"
                    }
            else:
                file_path = f"static/uploaded_videos/{file_name}.mp4"
                if os.path.exists(file_path):
                    return {
                        "type": file_type,
                        "url": f"/static/uploaded_videos/{file_name}.mp4"
                    }
                    
        raise HTTPException(status_code=404, detail="文件不存在")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history/{record_id}/download")
async def download_history_record(record_id: str):
    try:
        # 获取所有文件
        image_files = get_files_in_directory(Path("static/uploaded_images"), "图片")
        video_files = get_files_in_directory(Path("static/uploaded_videos"), "视频")
        all_files = image_files + video_files
        
        # 查找对应的文件
        idx = int(record_id) - 1
        if 0 <= idx < len(all_files):
            file = all_files[idx]
            file_name = file["name"]
            
            # 查找对应的zip文件
            zip_name = f"{file_name.split('_')[0]}.zip"
            zip_path = os.path.join("static/zip_files", zip_name)
            
            if os.path.exists(zip_path):
                return FileResponse(
                    path=zip_path,
                    filename=zip_name,
                    media_type='application/zip'
                )
                    
        raise HTTPException(status_code=404, detail="文件不存在")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)
