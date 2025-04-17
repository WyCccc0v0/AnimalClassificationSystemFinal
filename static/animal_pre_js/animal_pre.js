const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const results = document.getElementById("results");
const uploadButton = document.getElementById("uploadButton");
const resultButton = document.getElementById("resultButton");
const videoButton = document.getElementById("videoButton");
const uploadBox = document.getElementById("uploadBox");
const downloadLink = document.getElementById("downloadLink");
const floatingNav = document.getElementById("floatingNav");

// 支持的媒体类型
const supportedMediaTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/ogg']
};

let uploadedFiles = [];  // 存储上传的媒体文件
let uploadedFileNames = [];  // 存储上传后的文件名
let lastResultData = null;  // 存储最后一次API返回的结果数据

// 监听文件上传
imageInput.addEventListener("change", function (event) {
    preview.innerHTML = "";  // 清空预览
    uploadedFiles = Array.from(event.target.files);  // 获取所有选中的文件
    uploadedFileNames = [];
    lastResultData = null;

    if (uploadedFiles.length === 0) {
        alert("请选择至少一个文件进行上传！");
        return;
    }

    // 检查文件类型
    const unsupportedFiles = uploadedFiles.filter(file => {
        const isImage = supportedMediaTypes.image.includes(file.type);
        const isVideo = supportedMediaTypes.video.includes(file.type);
        return !isImage && !isVideo;
    });

    if (unsupportedFiles.length > 0) {
        alert(`以下文件类型不受支持: ${unsupportedFiles.map(f => f.name).join(', ')}\n支持的格式: 图片(JPG,PNG,GIF,WEBP) 视频(MP4,WEBM,OGG)`);
        uploadedFiles = uploadedFiles.filter(file => !unsupportedFiles.includes(file));
    }

    // 遍历所有上传的文件并进行预览
    uploadedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const mediaContainer = document.createElement("div");
            mediaContainer.style.display = "inline-block";
            mediaContainer.style.width = "calc((100% - 60px) / 3)";
            mediaContainer.style.margin = "10px";
            mediaContainer.style.verticalAlign = "top";

            const isVideo = supportedMediaTypes.video.includes(file.type);

            if (isVideo) {
                const video = document.createElement("video");
                video.src = e.target.result;
                video.alt = file.name;
                video.controls = true;
                video.style.width = "100%";
                video.style.height = "auto";
                video.style.objectFit = "contain";
                video.style.objectPosition = "center";
                video.style.border = "1px solid #ccc";
                video.style.borderRadius = "4px";
                mediaContainer.appendChild(video);
            } else {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.alt = file.name;
                img.style.width = "100%";
                img.style.height = "auto";
                img.style.objectFit = "contain";
                img.style.objectPosition = "center";
                img.style.border = "1px solid #ccc";
                img.style.borderRadius = "4px";
                img.style.display = "block";
                img.style.backgroundColor = "transparent";
                mediaContainer.appendChild(img);
            }

            const fileNameText = document.createElement("div");
            fileNameText.textContent = file.name.length > 15 ? file.name.substring(0, 12) + "..." : file.name;
            fileNameText.style.fontSize = "12px";
            fileNameText.style.textAlign = "center";
            fileNameText.style.marginTop = "5px";
            fileNameText.style.width = "100%";
            mediaContainer.appendChild(fileNameText);

            preview.appendChild(mediaContainer);
        };
        reader.readAsDataURL(file);
    });
});

// 拖拽进来时高亮边框
uploadBox.addEventListener("dragover", function (event) {
    event.preventDefault(); // 必须阻止默认行为
    uploadBox.style.borderColor = "#6d8aa6";
    uploadBox.style.backgroundColor = "#e0e6ed";
});

// 离开时恢复样式
uploadBox.addEventListener("dragleave", function () {
    uploadBox.style.borderColor = "#819cb9";
    uploadBox.style.backgroundColor = "#f8f9fa";
});

// 放下文件时处理上传
uploadBox.addEventListener("drop", function (event) {
    event.preventDefault(); // 阻止默认行为
    uploadBox.style.borderColor = "#819cb9";
    uploadBox.style.backgroundColor = "#f8f9fa";

    const droppedFiles = Array.from(event.dataTransfer.files);

    // 创建一个新的DataTransfer对象来设置文件
    const dataTransfer = new DataTransfer();
    droppedFiles.forEach(file => dataTransfer.items.add(file));

    imageInput.files = dataTransfer.files; // 同步文件到 input
    imageInput.dispatchEvent(new Event("change")); // 手动触发 change 事件
});

// 上传媒体文件到 FastAPI 服务器
async function uploadImages() {
    if (uploadedFiles.length === 0) {
        alert("请先选择文件！");
        return;
    }

    let formData = new FormData();
    uploadedFiles.forEach((file) => {
        formData.append("files", file);
    });

    uploadButton.disabled = true;

    try {
        const response = await fetch("http://127.0.0.1:8000/detect/", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("上传失败，请检查服务器是否启动！");
        }

        const resultData = await response.json();
        lastResultData = resultData; // 保存结果数据
        uploadedFileNames = resultData.results.map(item => item.filename);
        const firstName = uploadedFileNames[0];
        const zipFileName = firstName.replace(/^((\d+_\d+)).*\.(jpg|mp4)$/, "$1.zip");

        alert("文件上传成功，点击 '下载结果' 按钮获取压缩包！");

        downloadLink.style.display = "inline-block";
        downloadLink.href = `http://127.0.0.1:8000/zip_files/${zipFileName}`;
        downloadLink.setAttribute("download", zipFileName);

    } catch (error) {
        alert(`上传失败: ${error.message}`);
    } finally {
        uploadButton.disabled = false;
    }
}

// 获取检测后的结果（主要显示图片）
async function fetchResults() {
    if (!lastResultData && uploadedFileNames.length === 0) {
        alert("请先上传文件！");
        return;
    }

    results.innerHTML = '<div class="loading">加载中...</div>';  // 显示加载状态

    try {
        // 如果有缓存的结果数据，使用缓存，否则从服务器获取
        const resultData = lastResultData || await (await fetch("http://127.0.0.1:8000/detect/")).json();

        // 只显示图片结果
        const imageResults = resultData.results.filter(item =>
            item.type === "image" ||
            item.filename.endsWith('.jpg') ||
            item.filename.endsWith('.png') ||
            item.filename.endsWith('.gif') ||
            item.filename.endsWith('.webp')
        );

        if (imageResults.length === 0) {
            results.innerHTML = '<div class="no-results">没有找到图片结果！</div>';
            return;
        }

        results.innerHTML = "";  // 清除加载状态

        imageResults.forEach((result) => {
            const mediaContainer = document.createElement("div");
            mediaContainer.style.display = "inline-block";
            mediaContainer.style.width = "calc((100% - 60px) / 3)";
            mediaContainer.style.margin = "10px";
            mediaContainer.style.verticalAlign = "top";

            const img = document.createElement("img");
            img.src = result.url;
            img.alt = result.filename;
            img.style.width = "100%";
            img.style.height = "auto";
            img.style.objectFit = "contain";
            img.style.objectPosition = "center";
            img.style.border = "1px solid #ccc";
            img.style.borderRadius = "4px";
            mediaContainer.appendChild(img);

            const fileNameText = document.createElement("div");
            fileNameText.textContent = result.filename.length > 20 ?
                result.filename.substring(0, 17) + "..." : result.filename;
            fileNameText.style.fontSize = "12px";
            fileNameText.style.textAlign = "center";
            fileNameText.style.marginTop = "5px";
            fileNameText.style.width = "100%";
            mediaContainer.appendChild(fileNameText);

            // 如果有检测结果，显示检测信息
            if (result.detections && result.detections.length > 0) {
                const detectionInfo = document.createElement("div");
                detectionInfo.style.fontSize = "12px";
                detectionInfo.style.textAlign = "center";
                detectionInfo.style.marginTop = "5px";
                detectionInfo.style.width = "100%";
                detectionInfo.innerHTML = result.detections.map(det =>
                    `${det.class}: ${(det.confidence * 100).toFixed(1)}%`
                ).join("<br>");
                mediaContainer.appendChild(detectionInfo);
            }

            results.appendChild(mediaContainer);
        });

    } catch (error) {
        results.innerHTML = `<div class="error">获取结果失败: ${error.message}</div>`;
    }
}

// 获取检测后的视频结果
async function fetchVideoResults() {
    if (!lastResultData && uploadedFileNames.length === 0) {
        alert("请先上传文件！");
        return;
    }

    results.innerHTML = '<div class="loading">加载中...</div>';

    try {
        // 如果有缓存的结果数据，使用缓存，否则从服务器获取
        const resultData = lastResultData || await (await fetch("http://127.0.0.1:8000/detect/")).json();

        // 只显示视频结果
        const videoResults = resultData.results.filter(item =>
            item.type === "video" ||
            item.filename.endsWith('.mp4') ||
            item.filename.endsWith('.webm') ||
            item.filename.endsWith('.ogg')
        );

        if (videoResults.length === 0) {
            results.innerHTML = '<div class="no-results">没有找到视频结果！</div>';
            return;
        }

        results.innerHTML = "";  // 清除加载状态

        videoResults.forEach((result) => {
            const mediaContainer = document.createElement("div");
            mediaContainer.style.display = "inline-block";
            mediaContainer.style.width = "calc((100% - 60px) / 3)";
            mediaContainer.style.margin = "10px";
            mediaContainer.style.verticalAlign = "top";

            const video = document.createElement("video");
            video.src = result.url;
            video.alt = result.filename;
            video.controls = true;
            video.style.width = "100%";
            video.style.height = "auto";
            video.style.objectFit = "contain";
            video.style.objectPosition = "center";
            video.style.border = "1px solid #ccc";
            video.style.borderRadius = "4px";
            mediaContainer.appendChild(video);

            const fileNameText = document.createElement("div");
            fileNameText.textContent = result.filename.length > 15 ?
                result.filename.substring(0, 12) + "..." : result.filename;
            fileNameText.style.fontSize = "12px";
            fileNameText.style.textAlign = "center";
            fileNameText.style.marginTop = "5px";
            fileNameText.style.width = "100%";
            mediaContainer.appendChild(fileNameText);

            results.appendChild(mediaContainer);
        });

    } catch (error) {
        results.innerHTML = `<div class="error">获取视频结果失败: ${error.message}</div>`;
    }
}

// 悬浮按钮提示框
document.querySelectorAll('.floating-button').forEach(function(button) {
    const tooltip = button.querySelector('.tooltip');
    button.addEventListener('mouseover', function() {
        tooltip.style.display = 'block';
    });
    button.addEventListener('mouseout', function() {
        tooltip.style.display = 'none';
    });
});