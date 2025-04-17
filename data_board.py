import os
from datetime import datetime

# 定义文件路径
IDENTIFY_FILE = "./static/data/identify.txt"
WARN_FILE = "./static/data/warn.txt"
WARN_SET_FILE = "./static/data/warn_set.txt"

def update_identify_file(detected_animal_count):
    """
    更新 identify.txt 文件内容
    参数:
        detected_animal_count: 本次检测到的动物数量（整数）
    """
    # 文件路径
    FILE_PATH = "static/data/identify.txt"
    
    # 确保目录存在
    os.makedirs(os.path.dirname(FILE_PATH), exist_ok=True)
    
    # 当前日期格式化为 YYYYMMDD
    today = datetime.now().strftime("%Y%m%d")
    
    # 读取现有数据
    data = {"all": 0}
    if os.path.exists(FILE_PATH):
        with open(FILE_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and ":" in line:
                    key, value = line.split(":", 1)
                    data[key.strip()] = int(value.strip())
    
    # 更新数据
    data["all"] = data.get("all", 0) + detected_animal_count
    data[today] = data.get(today, 0) + detected_animal_count
    
    # 写入文件（保持all在第一行，其他按日期倒序）
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        # 写入all总数
        f.write(f"all: {data['all']}\n")
        
        # 写入其他日期（排除all后按日期倒序）
        dates = sorted(
            [k for k in data.keys() if k != "all" and k.isdigit()],
            reverse=True
        )
        for date in dates:
            f.write(f"{date}: {data[date]}\n")
    
    print(f"文件已更新 | 总数量: {data['all']} | 今日新增: {detected_animal_count}")

def update_warn_file(detected_animals):
    """
    更新 warn.txt 文件内容
    参数:
        detected_animals: 检测到的动物列表
    """
    # 文件路径
    WARN_FILE_PATH = "static/data/warn.txt"
    WARN_SET_FILE_PATH = "static/data/warn_set.txt"
    
    # 初始化数组
    warn_flags = [0] * 80
    animal_list = ["熊","棕熊","公牛","蝴蝶","骆驼","金丝雀","毛毛虫","牛",
    "蜈蚣","猎豹","鸡","螃蟹","鳄鱼","鹿","鸭子","鹰","大象","鱼","狐狸",
    "青蛙","长颈鹿","山羊","金鱼","鹅","仓鼠","港海豹","刺猬","河马","马",
    "美洲虎","水母","袋鼠","考拉","瓢虫","豹","狮子","蜥蜴","猞猁","喜鹊",
    "猴子","蛾和蝴蝶","老鼠","骡子","鸵鸟","水獭","猫头鹰","熊猫","鹦鹉",
    "企鹅","猪","北极熊","兔子","浣熊","渡鸦","小熊猫","犀牛","蝎子","海狮",
    "海龟","海马","鲨鱼","羊","虾","蜗牛","蛇","麻雀","蜘蛛","鱿鱼","松鼠",
    "海星","天鹅","蜱虫","老虎","陆龟","火鸡","海龟","鲸鱼","啄木鸟","蠕虫","斑马"] * 80  # 请填入动物名称
    
    # 读取 warn_set.txt 文件
    if os.path.exists(WARN_SET_FILE_PATH):
        with open(WARN_SET_FILE_PATH, "r", encoding="utf-8") as file:
            for index, line in enumerate(file):
                animal, flag = line.strip().split(":")
                warn_flags[index] = int(flag)
                animal_list[index] = animal
    
    # 获取当前日期
    today = datetime.now().strftime("%Y%m%d")
    warn_data = {}
    
    # 读取现有 warn.txt 数据
    if os.path.exists(WARN_FILE_PATH):
        with open(WARN_FILE_PATH, "r", encoding="utf-8") as file:
            current_date = None
            current_data = {}
            for line in file:
                line = line.strip()
                if line.startswith("all:"):
                    # 跳过全局all行，我们会在最后重新计算
                    continue
                elif line and "," in line and "[" in line:
                    date_part, data_part = line.split("[", 1)
                    current_date, day_all = date_part.split(",day_all:")
                    current_data = {}
                    warn_data[current_date] = {"day_all": int(day_all)}
                elif line and ":" in line and not line.startswith("all:"):
                    animal, count = line.split(":")
                    current_data[animal] = int(count)
                elif line == "]":
                    warn_data[current_date].update(current_data)
    
    # 更新 warn 数据
    if today not in warn_data:
        warn_data[today] = {animal: 0 for animal in animal_list}
        warn_data[today]["day_all"] = 0  # 初始化 day_all

    # 更新检测到的动物计数
    for animal in detected_animals:
        if animal in animal_list:
            index = animal_list.index(animal)
            if warn_flags[index] == 1:
                warn_data[today][animal] += 1

    # 计算当前日期的day_all (不包括all)
    day_all = sum(count for animal, count in warn_data[today].items() 
                 if animal != "day_all")
    warn_data[today]["day_all"] = day_all
    
    # 计算全局all (所有日期的day_all之和)
    total_all = sum(data["day_all"] for date, data in warn_data.items() 
                   if date != "all")

    # 写入更新后的 warn 数据
    with open(WARN_FILE_PATH, "w", encoding="utf-8") as file:
        # 写入全局all
        file.write(f"all: {total_all}\n")
        
        # 写入各日期数据
        for date, data in warn_data.items():
            if date == "all":
                continue
            data_str = "\n".join(f"{animal}:{count}" 
                               for animal, count in data.items() 
                               if animal != "day_all")
            file.write(f"{date},day_all:{data['day_all']}[\n{data_str}\n]\n")