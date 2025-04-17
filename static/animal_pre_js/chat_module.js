// 获取 DOM 元素
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const voiceButton = document.querySelector(".voice-button");

// 讯飞语音识别相关
import IAT_CONFIG from './iat_config.js'; // 导入讯飞配置
import { startRecognition, stopRecognition } from './iat_processor.js'; // 导入处理器函数

// const RecorderManager = window.RecorderManager; // 不再直接使用
// let rm = null; // 不再直接使用
let isRecording = false;
// let currentRecognizedText = ''; // 识别结果由 iat_processor 处理

// 创建加载动画
function createLoadingIndicator() {
    const loading = document.createElement("div");
    loading.className = "loading-message";
    loading.innerHTML = `
        <div class="loading-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    return loading;
}

// // 初始化讯飞 RecorderManager <-- REMOVED
// function initRecorderManager() { ... }

// 处理识别结果的回调
function handleRecognitionResult(text, isFinal) {
    console.log('Recognition Result:', text, 'Is Final:', isFinal);
    userInput.value += text; // 更新输入框
    if (isFinal) {
        // 识别结束，更新状态和 UI
        isRecording = false;
        voiceButton.classList.remove("active");
        userInput.placeholder = "输入您的问题...";
        const micIcon = document.querySelector('.fa-microphone');
        if (micIcon) {
            micIcon.classList.remove('recording');
        }
    }
}

// 处理识别错误的回调
function handleRecognitionError(errorMessage) {
    console.error('Recognition Error:', errorMessage);
    userInput.value = `[语音识别错误] ${errorMessage}`;
    // 识别出错，更新状态和 UI
    isRecording = false;
    voiceButton.classList.remove("active");
    userInput.placeholder = "输入您的问题...";
    const micIcon = document.querySelector('.fa-microphone');
    if (micIcon) {
        micIcon.classList.remove('recording');
    }
    // 确保停止，以防万一
    stopRecognition();
}

// 切换讯飞语音识别状态
async function toggleVoiceRecognition() {
    if (!IAT_CONFIG.APPID || IAT_CONFIG.APPID === 'YOUR_APPID') {
        alert('请先在 animal/static/animal_pre_js/iat_config.js 文件中配置讯飞语音识别的 APPID, API_KEY, 和 API_SECRET！');
        return;
    }

    // 不再需要 initRecorderManager();

    if (!isRecording) {
        try {
            // 更新 UI 状态为“正在聆听”
            isRecording = true;
            voiceButton.classList.add("active");
            userInput.placeholder = "正在聆听...";
            userInput.value = ""; // 清空输入框
            const micIcon = document.querySelector('.fa-microphone');
            if (micIcon) {
                micIcon.classList.add('recording');
            }
            // 调用 iat_processor 的启动函数
            startRecognition(handleRecognitionResult, handleRecognitionError);
        } catch (err) {
            console.error('启动讯飞录音失败 (chat_module):', err);
            handleRecognitionError('无法启动录音，请检查麦克风权限或配置。');
        }
    } else {
        // 调用 iat_processor 的停止函数
        stopRecognition();
        // UI 状态的更新现在主要在回调函数中处理，但可以先重置一部分
        isRecording = false; // 立即设置状态，防止重复点击
        voiceButton.classList.remove("active");
        userInput.placeholder = "输入您的问题...";
        const micIcon = document.querySelector('.fa-microphone');
        if (micIcon) {
            micIcon.classList.remove('recording');
        }
    }
}

// // 停止讯飞录音（封装以便复用） <-- REMOVED, use stopRecognition from iat_processor
// function stopXunfeiRecording() { ... }

// 移除旧的 WebSocket 相关代码和函数
/*
let mediaRecorder;
let audioContext;
let processor;
let stream;
let ws;
let websocket;
let audioChunks = [];

async function toggleVoiceRecognition_OLD() { ... }
function startVoiceRecognition() { ... }
function stopVoiceRecognition() { ... }
function convertFloat32ToInt16(buffer) { ... }
*/

async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "") return;

    // 显示用户消息
    const userDiv = document.createElement("div");
    userDiv.className = "message user-message";
    userDiv.textContent = message;
    chatBox.appendChild(userDiv);

    // 清空输入框并禁用
    userInput.value = "";
    userInput.disabled = true;

    // 显示加载动画
    const loadingIndicator = createLoadingIndicator();
    chatBox.appendChild(loadingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });

        // 移除加载动画
        loadingIndicator.remove();

        const data = await response.json();

        // 显示模型回复
        const modelDiv = document.createElement("div");
        modelDiv.className = "message model-message";
        modelDiv.textContent = response.ok ?
            (data.response || "抱歉，无法获取回答") :
            `错误: ${data.detail || "请求失败，请稍后重试"}`;
        chatBox.appendChild(modelDiv);
    } catch (error) {
        loadingIndicator.remove();
        const errorDiv = document.createElement("div");
        errorDiv.className = "message model-message";
        errorDiv.textContent = "网络错误，请检查服务器连接";
        chatBox.appendChild(errorDiv);
    }

    // 恢复输入框并滚动到底部
    userInput.disabled = false;
    userInput.focus();
    chatBox.scrollTop = chatBox.scrollHeight;
}

// // 回车发送消息  <-- REMOVED THIS BLOCK
// userInput.addEventListener('keypress', function(e) {
//     if (e.key === 'Enter' && !e.shiftKey) {
//         e.preventDefault();
//         sendMessage();
//     }
// });

// 页面加载时处理事件绑定和配置检查
document.addEventListener('DOMContentLoaded', () => {
    // 配置检查
    if (!IAT_CONFIG.APPID || IAT_CONFIG.APPID === 'YOUR_APPID') {
        console.warn('讯飞语音识别配置未完成，请在 animal/static/animal_pre_js/iat_config.js 中填写凭证。');
        // 可以选择禁用语音按钮或显示提示
        // voiceButton.disabled = true;
        // voiceButton.title = '请先配置讯飞语音识别凭证';
    }

    // 绑定语音按钮点击事件
    const voiceBtn = document.querySelector('.voice-button');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceRecognition);
    } else {
        console.error('Voice button not found!');
    }

    // 绑定发送按钮点击事件
    const sendBtn = document.querySelector('.send-button:not(.voice-button)');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    } else {
        console.error('Send button not found!');
    }

    // 绑定输入框回车事件
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // 阻止默认的回车换行
                sendMessage();
            }
        });
    } else {
         console.error('User input element not found!');
    }
});

// // 确保在 DOM 加载完成后再绑定事件 <-- REMOVED THIS BLOCK
// document.addEventListener('DOMContentLoaded', () => {
//     const voiceButton = document.querySelector('.voice-button');
//     if (voiceButton) {
//         voiceButton.addEventListener('click', toggleVoiceRecognition);
//     } else {
//         console.error('Voice button not found!');
//     }
//
//     // 如果发送按钮也需要 JS 绑定（当前是 onclick）
//     const sendButton = document.querySelector('.send-button:not(.voice-button)');
//     if (sendButton) {
//         // 如果 sendMessage 也在模块作用域内，需要类似处理
//         // sendButton.addEventListener('click', sendMessage);
//     } else {
//         console.error('Send button not found!');
//     }
//
//     // 如果输入框需要事件监听（例如回车发送）
//     const userInput = document.getElementById('user-input');
//     if (userInput) {
//         userInput.addEventListener('keypress', function(event) {
//             if (event.key === 'Enter') {
//                 sendMessage();
//             }
//         });
//     }
// });
