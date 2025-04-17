import IAT_CONFIG from './iat_config.js';

// 讯飞语音听写 WebSocket URL
const IAT_URL = 'wss://iat-api.xfyun.cn/v2/iat';

let recorderManager;
let websocket;
let currentText = ''; // 用于累积识别结果
let onResultCallback; // 回调函数，用于将结果传递给 chat_module.js
let onErrorCallback; // 回调函数，用于处理错误
let isRecording = false;

// 获取认证 URL
function getAuthUrl() {
    const apiKey = IAT_CONFIG.API_KEY;
    const apiSecret = IAT_CONFIG.API_SECRET;
    const url = new URL(IAT_URL);
    const host = url.host;
    const date = new Date().toGMTString();
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';

    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${url.pathname} HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);

    const authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);

    return `${url.toString()}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
}

// 初始化 RecorderManager
function initRecorderManager() {
    // 注意：'./' 表示相对于当前 JS 文件的路径
    // 如果 processor 文件放在 animal_pre_js 目录下，路径应为 './'
    // 如果放在 static 目录下，路径应为 '../'
    // recorderManager = new RecorderManager('./'); // 指定 processor.worker.js 和 processor.worklet.js 的路径
    // 改为相对于 HTML 文件的路径
    recorderManager = new RecorderManager('animal_pre_js/');

    recorderManager.onStart = () => {
        console.log('RecorderManager started');
        isRecording = true;
        // 可以在这里更新 UI 状态
    };

    recorderManager.onStop = (audioBuffers) => {
        console.log('RecorderManager stopped');
        isRecording = false;
        // 发送结束帧
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ data: { status: 2, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' } }));
        }
        // 可以在这里更新 UI 状态
    };

    recorderManager.onFrameRecorded = ({ isLastFrame, frameBuffer }) => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            // 发送音频数据帧
            websocket.send(JSON.stringify({
                data: {
                    status: 1,
                    format: 'audio/L16;rate=16000',
                    encoding: 'raw',
                    audio: arrayBufferToBase64(frameBuffer)
                }
            }));
        }
    };

    recorderManager.onError = (error) => {
        console.error('RecorderManager error:', error);
        isRecording = false;
        if (onErrorCallback) {
            onErrorCallback('录音设备错误: ' + error.message);
        }
        stopRecognition(); // 发生错误时停止
    };
}

// ArrayBuffer 转 Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// 连接 WebSocket
function connectWebSocket() {
    const url = getAuthUrl();
    websocket = new WebSocket(url);

    websocket.onopen = () => {
        console.log('WebSocket connected');
        // 发送开始参数帧
        websocket.send(JSON.stringify({
            common: { app_id: IAT_CONFIG.APPID },
            business: {
                language: 'zh_cn', // 语言
                domain: 'iat',     // 应用领域
                accent: 'mandarin', // 口音
                vad_eos: 5000,     // 静音超时时间
                dwa: 'wpgs'        // 动态修正
            },
            data: {
                status: 0,
                format: 'audio/L16;rate=16000',
                encoding: 'raw',
                audio: ''
            }
        }));
        // WebSocket 连接成功后开始录音
        startRecordingInternal();
    };

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        if (data.code !== 0) {
            console.error(`WebSocket error: ${data.code} ${data.message}`);
            if (onErrorCallback) {
                onErrorCallback(`语音服务错误: ${data.message}`);
            }
            stopRecognition(); // 发生错误时停止
            return;
        }

        if (data.data && data.data.result) {
            const result = data.data.result;
            let text = '';
            result.ws.forEach(wordInfo => {
                wordInfo.cw.forEach(charInfo => {
                    text += charInfo.w;
                });
            });

            if (result.ls) { // ls=true 表示是最终结果
                currentText += text;
                if (onResultCallback) {
                    onResultCallback(currentText, true); // true 表示是最终结果
                }
            } else { // 中间结果
                if (onResultCallback) {
                    onResultCallback(currentText + text, false); // false 表示是中间结果
                }
            }
        }

        if (data.data && data.data.status === 2) {
            console.log('WebSocket session ended');
            // 收到结束标识，关闭 WebSocket
            websocket.close();
            websocket = null;
            // 确保录音也已停止
            if (isRecording) {
                recorderManager.stop();
            }
        }
    };

    websocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (onErrorCallback) {
            onErrorCallback('WebSocket 连接错误');
        }
        stopRecognition(); // 发生错误时停止
    };

    websocket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        // 确保录音停止
        if (isRecording) {
           recorderManager.stop();
        }
        websocket = null;
    };
}

// 内部启动录音逻辑
function startRecordingInternal() {
    if (!recorderManager) {
        initRecorderManager();
    }
    currentText = ''; // 重置累积文本
    recorderManager.start({
        sampleRate: 16000,
        frameSize: 1280, // 讯飞推荐帧大小，40ms * 16kHz * 16bit / 8 = 1280 bytes
        arrayBufferType: 'short16' // 讯飞需要 16bit PCM
    });
}

// 暴露给外部的启动函数
export function startRecognition(onResult, onError) {
    if (isRecording) {
        console.warn('Recognition is already in progress.');
        return;
    }
    if (!IAT_CONFIG.APPID || IAT_CONFIG.APPID === 'YOUR_APPID') {
        alert('请先在 animal_pre_js/iat_config.js 文件中配置讯飞 APPID、API_SECRET 和 API_KEY！');
        if (onError) {
            onError('请配置讯飞凭证');
        }
        return;
    }

    onResultCallback = onResult;
    onErrorCallback = onError;
    connectWebSocket(); // 启动时连接 WebSocket，连接成功后会自动开始录音
}

// 暴露给外部的停止函数
export function stopRecognition() {
    if (!isRecording && (!websocket || websocket.readyState !== WebSocket.OPEN)) {
        console.warn('Recognition is not running or WebSocket is not open.');
        return;
    }
    if (recorderManager && isRecording) {
        recorderManager.stop(); // 停止录音，onStop 会发送结束帧
    } else if (websocket && websocket.readyState === WebSocket.OPEN) {
        // 如果录音已停止但 WebSocket 仍打开，手动发送结束帧并关闭
        websocket.send(JSON.stringify({ data: { status: 2, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' } }));
    }
}

// 检查是否正在录音
export function checkIsRecording() {
    return isRecording;
}