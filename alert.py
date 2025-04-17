from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from pathlib import Path

router = APIRouter(prefix="/api/alert")  # Add prefix to router

# 定义数据模型
class AlertStatus(BaseModel):
    status: list[int]

# 获取 warn_set.txt 文件路径
# 修改文件路径的获取方式
base_dir = Path(__file__).parent
warn_file_path = base_dir / "static" / "data" / "warn_set.txt"

# 修改为
warn_file_path = Path(__file__).parent / "static" / "data" / "warn_set.txt"

# 动物列表
ANIMAL_LIST = [
    "熊", "棕熊", "公牛", "蝴蝶", "骆驼", "金丝雀", "毛毛虫", "牛", "蜈蚣", 
    "猎豹", "鸡", "螃蟹", "鳄鱼", "鹿", "鸭子", "鹰", "大象", "鱼", "狐狸", 
    "青蛙", "长颈鹿", "山羊", "金鱼", "鹅", "仓鼠", "港海豹", "刺猬", "河马", 
    "马", "美洲虎", "水母", "袋鼠", "考拉", "瓢虫", "豹", "狮子", "蜥蜴", "猞猁", 
    "喜鹊", "猴子", "蛾和蝴蝶", "老鼠", "骡子", "鸵鸟", "水獭", "猫头鹰", "熊猫", 
    "鹦鹉", "企鹅", "猪", "北极熊", "兔子", "浣熊", "渡鸦", "小熊猫", "犀牛", "蝎子", 
    "海狮", "海龟", "海马", "鲨鱼", "羊", "虾", "蜗牛", "蛇", "麻雀", "蜘蛛", "鱿鱼", 
    "松鼠", "海星", "天鹅", "蜱虫", "老虎", "陆龟", "火鸡", "海龟", "鲸鱼", "啄木鸟", 
    "蠕虫", "斑马"
]

@router.get("/status")  # Changed from /get_alert_status
async def get_alert_status():
    """获取所有动物的预警状态"""
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(warn_file_path), exist_ok=True)
        
        # 如果文件不存在，创建默认文件
        if not os.path.exists(warn_file_path):
            with open(warn_file_path, "w", encoding="utf-8") as f:
                for animal in ANIMAL_LIST:
                    f.write(f"{animal}: 0\n")
            return {"status": [0] * len(ANIMAL_LIST)}
            
        # 读取现有文件
        with open(warn_file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            status = []
            for line in lines:
                try:
                    value = int(line.split(":")[1].strip())
                    status.append(value)
                except (IndexError, ValueError):
                    status.append(0)
                    
            # 确保状态列表长度正确
            while len(status) < len(ANIMAL_LIST):
                status.append(0)
                
            return {"status": status[:len(ANIMAL_LIST)]}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update")  # Changed from /update_alert_status
async def update_alert_status(data: AlertStatus):
    """更新动物预警状态"""
    try:
        # 确保状态列表长度正确
        if len(data.status) != len(ANIMAL_LIST):
            raise HTTPException(status_code=400, detail="状态列表长度不正确")
            
        # 确保目录存在
        os.makedirs(os.path.dirname(warn_file_path), exist_ok=True)
        
        # 写入新状态
        with open(warn_file_path, "w", encoding="utf-8") as f:
            for animal, status in zip(ANIMAL_LIST, data.status):
                f.write(f"{animal}: {status}\n")
                
        return {"message": "预警状态更新成功"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))