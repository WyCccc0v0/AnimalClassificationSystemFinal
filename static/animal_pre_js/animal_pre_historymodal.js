export function fetchHistoryData() {
    const baseUrl = 'http://127.0.0.1:8000';  // 添加这行，指定后端地址
    const imageFilesPromise = fetch(`${baseUrl}/files/images`).then(res => res.json());
    const videoFilesPromise = fetch(`${baseUrl}/files/videos`).then(res => res.json());
    const zipFilesPromise = fetch(`${baseUrl}/files/zip`).then(res => res.json());

    // 等待所有文件数据的返回
    Promise.all([imageFilesPromise, videoFilesPromise, zipFilesPromise])
        .then(([imageFiles, videoFiles, zipFiles]) => {
            // 清空历史记录表
            const historyBody = document.querySelector('.history-body');
            historyBody.innerHTML = ''; // 清空现有的记录

            // 处理上传图片文件（uploaded_images）
            const imageBatches = groupFilesByDate(imageFiles);
            imageBatches.forEach(batch => {
                const row = createHistoryRow(batch.date, batch.count, '图片');
                historyBody.appendChild(row);
            });

            // 处理上传视频文件（uploaded_videos）
            const videoBatches = groupFilesByDate(videoFiles);
            videoBatches.forEach(batch => {
                const row = createHistoryRow(batch.date, batch.count, '视频');
                historyBody.appendChild(row);
            });
        })
        .catch(err => {
            console.error('获取文件数据失败', err);
        });
}

// 根据文件名中的日期分组文件
function groupFilesByDate(files) {
    const grouped = {};

    files.forEach(file => {
        const date = file.name.slice(0, 15); // 获取年月日_时间（例如：20250415_092925）
        if (!grouped[date]) {
            grouped[date] = { date, count: 0 };
        }
        grouped[date].count++;
    });

    return Object.values(grouped);
}

// 创建历史记录行
function createHistoryRow(date, count, type) {
    const row = document.createElement('div');
    row.classList.add('history-row');

    // 创建每个列的 div
    const dateCol = document.createElement('div');
    dateCol.classList.add('col');
    dateCol.textContent = date;

    const countCol = document.createElement('div');
    countCol.classList.add('col');
    countCol.textContent = count;

    const typeCol = document.createElement('div');
    typeCol.classList.add('col');
    typeCol.textContent = type;

    const actionCol = document.createElement('div');
    actionCol.classList.add('col');

    // 创建按钮
    const viewBtn = document.createElement('button');
    viewBtn.classList.add('btn-view');
    viewBtn.textContent = '查看';
    viewBtn.onclick = () => viewFile(date, type);

    const downloadBtn = document.createElement('button');
    downloadBtn.classList.add('btn-download');
    downloadBtn.textContent = '下载';
    downloadBtn.onclick = () => downloadFile(date);

    // 组装行
    actionCol.appendChild(viewBtn);
    actionCol.appendChild(downloadBtn);
    
    row.appendChild(dateCol);
    row.appendChild(countCol);
    row.appendChild(typeCol);
    row.appendChild(actionCol);
    
    return row;
}

// 添加查看文件功能
function viewFile(date, type) {
    const baseUrl = 'http://127.0.0.1:8000';
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // 清空结果区域
    
    if (type === '图片') {
        // 获取同一批次的所有图片文件
        fetch(`${baseUrl}/files/images?batch=${date}`)
            .then(res => res.json())
            .then(imageFiles => {
                imageFiles.forEach(file => {
                    const mediaContainer = document.createElement("div");
                    mediaContainer.style.display = "inline-block";
                    mediaContainer.style.width = "calc((100% - 60px) / 3)";
                    mediaContainer.style.margin = "10px";
                    mediaContainer.style.verticalAlign = "top";

                    const img = document.createElement("img");
                    img.src = `${baseUrl}/static/uploaded_images/${file.name}`;
                    img.style.width = "100%";
                    img.style.height = "auto";
                    img.style.objectFit = "contain";
                    img.style.objectPosition = "center";
                    img.style.border = "1px solid #ccc";
                    img.style.borderRadius = "4px";
                    mediaContainer.appendChild(img);

                    const fileNameText = document.createElement("div");
                    fileNameText.textContent = file.name;
                    fileNameText.style.fontSize = "12px";
                    fileNameText.style.textAlign = "center";
                    fileNameText.style.marginTop = "5px";
                    fileNameText.style.width = "100%";
                    mediaContainer.appendChild(fileNameText);

                    resultsDiv.appendChild(mediaContainer);
                });
            })
            .catch(err => {
                console.error('获取图片数据失败', err);
            });
    } else {
        // 创建视频容器
        const mediaContainer = document.createElement("div");
        mediaContainer.style.display = "inline-block";
        mediaContainer.style.width = "calc((100% - 60px) / 3)";
        mediaContainer.style.margin = "10px";
        mediaContainer.style.verticalAlign = "top";

        const video = document.createElement("video");
        video.src = `${baseUrl}/static/uploaded_videos/${date}_001.mp4`;
        video.controls = true;
        video.style.width = "100%";
        video.style.height = "auto";
        video.style.objectFit = "contain";
        video.style.objectPosition = "center";
        video.style.border = "1px solid #ccc";
        video.style.borderRadius = "4px";
        mediaContainer.appendChild(video);

        const fileNameText = document.createElement("div");
        fileNameText.textContent = `${date}_001.mp4`;
        fileNameText.style.fontSize = "12px";
        fileNameText.style.textAlign = "center";
        fileNameText.style.marginTop = "5px";
        fileNameText.style.width = "100%";
        mediaContainer.appendChild(fileNameText);

        resultsDiv.appendChild(mediaContainer);
    }

    // 关闭历史记录模态框
    toggleHistoryTable();
}

// 下载功能：根据日期下载文件
export function downloadFile(date) {
    const baseUrl = 'http://127.0.0.1:8000';  // 使用后端服务器地址
    const zipFile = `${baseUrl}/zip_files/${date}.zip`;  // 添加 baseUrl
    
    // 使用完整的URL路径
    window.location.href = zipFile;
}

export function toggleHistoryTable() {
    const modal = document.getElementById('historyModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

export function initializeHistoryModal() {
    const closeButton = document.querySelector('.history-close');
    const historyButton = document.getElementById('historyButton');

    // 关闭按钮事件
    closeButton.addEventListener('click', toggleHistoryTable);

    // 打开历史记录表按钮事件
    historyButton.addEventListener('click', () => {
        toggleHistoryTable();
        fetchHistoryData();  // 打开时加载历史记录
    });
}