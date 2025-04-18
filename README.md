<img width="1244" alt="1744909039411" src="https://github.com/user-attachments/assets/4ff5e3b9-f19d-4682-a24e-8cb64cd5d045" /># **动物检测系统——Animal Vision**

基于YOLOv11与DeepSeek-R1-1.5B大模型的智能动物检测系统，构建集动物识别、知识学习与智能问答于一体的动物百科系统——AnimalVision。系统通过改进的YOLOv11实现高精度动物检测，结合微调的大语言模型提供专业知识解答，形成"视觉识别-知识推送-交互问答"的完整生态链，适用于科普教育、生态研究等场景

## 目录
- [系统预览](#系统预览)
- [主要功能](#主要功能)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [安装部署](#安装部署)
- [使用说明](#使用说明)
  - [图片/视频检测](#图片视频检测)
  - [实时检测](#实时检测)
  - [预警功能](#预警功能)
  - [历史记录](#历史记录)
  - [数据统计](#数据统计)
- [注意事项](#注意事项)

## 系统预览
本系统是一个功能完备的动物智能检测平台，具有以下特点：

- **直观的用户界面**：提供简洁美观的Web界面，支持拖拽上传和实时预览
- <img width="1244" alt="51fc7ab979740df42fd39c49f912683" src="https://github.com/user-attachments/assets/8a0ba970-e41d-4e30-9f9b-bc0eb327d0eb" />
<img width="1244" alt="1744909039411" src="https://github.com/user-attachments/assets/3ecc6943-d755-432c-9437-bd56b0468fbe" />

- **强大的检测能力**：基于YOLOv11模型，可准确识别多种动物类型
  <img width="1274" alt="4566d449d2edd18acd42703c16cc6cf" src="https://github.com/user-attachments/assets/5c36370f-d970-48af-ae0a-8038b6190764" />

- **实时监控预警**：支持图片和视频检测和自定义预警规则
  <img width="1244" alt="1744910000746" src="https://github.com/user-attachments/assets/8a6cf8ae-ebff-4669-ac90-69435a057ae8" />

- **完整的数据分析**：提供检测历史记录和数据统计功能
  ![bb14838682c2d759131843c8b77751a](https://github.com/user-attachments/assets/0c0b8126-8265-4f0a-b432-8832ed58c495)
  ![e199e8a4b58f156dfdf8aceed0166e4](https://github.com/user-attachments/assets/d0b14e7e-9aff-447e-abd2-31845bfe3707)

- **智能AI对话**：集成Ollama API，支持智能问答交互（文本和语音交互）
  <img width="1244" alt="83e0c6efb520ff4a71fee38a82b9255" src="https://github.com/user-attachments/assets/1d54cb2c-00d9-44cc-ade4-9dd6127f56cc" />


## 主要功能

- 图片和视频动物种类检测
- 批量文件处理
- 检测结果可视化
- 历史记录管理
- 动物预警系统
- 数据统计面板
- AI助手对话功能

## 技术栈

- 后端：FastAPI
- 深度学习：YOLO
- AI对话：Ollama API
- 前端：HTML/CSS/JavaScript
- 图像处理：OpenCV,YOLOv11模型, Pillow
- 数据处理：NumPy, Torch

## 目录结构

```
├── main.py              # 主程序入口
├── alert.py             # 预警系统
├── history.py           # 历史记录管理
├── data_board.py        # 数据面板
├── best.pt              # YOLO模型文件
├── static/              # 静态资源
│   ├── animal_pre.html  # 主页面
│   ├── data_board.html  # 数据面板页面
│   ├── chat_module.html # 对话模块页面
│   ├── animal_pre_css/  # CSS样式文件
│   ├── animal_pre_js/   # JavaScript文件
│   └── data/           # 数据存储
```

## 安装部署

1. 安装依赖：
```bash
pip install -r requirements.txt
```

2. 启动服务：
```bash
python main.py
```

3. 访问系统：
   - 打开浏览器访问 http://localhost:8000
   - 系统首页：http://localhost:8000/static/homepage.html
   - 数据面板：http://localhost:8000/static/data_board.html

## 使用说明

1. 图片/视频检测：
   - 支持拖拽或点击上传
   - 支持批量处理
   - 自动保存检测结果

2. 实时检测：
   - 通过WebSocket接口实现
   - 支持实时视频流

3. 预警功能：
   - 可配置动物预警列表
   - 自动记录预警信息

4. 历史记录：
   - 查看历史检测结果
   - 下载检测结果文件

5. 数据统计：
   - 查看检测数据统计
   - 预警信息统计

## 注意事项

- 确保系统已安装Python 3.8+
- 需要CUDA支持以获得更好的性能
- 定期清理历史文件避免占用过多空间
- 系统使用的目标检测大模型为YOLOv11n，微调大模型使用的数据集已上传到HuggingFace，请自行下载
- 本项目仅供学习使用，严禁商用
