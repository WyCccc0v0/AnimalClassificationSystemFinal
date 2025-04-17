

// 新增函数：读取文件数据并更新统计信息
export async function fetchDataAndUpdateStats() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    try {
        const identifyResponse = await fetch('/static/data/identify.txt?v=' + Date.now());
        if (!identifyResponse.ok) throw new Error("文件加载失败");
        const identifyText = await identifyResponse.text();
        const identifyLines = identifyText.split('\n');
        const totalIdentify = identifyLines.find(line => line.startsWith('all:')).split(':')[1].trim();
        const todayIdentifyLine = identifyLines.find(line => line.startsWith(today));
        const todayIdentify = todayIdentifyLine ? todayIdentifyLine.split(':')[1].trim() : '0';

        const warnResponse = await fetch('/static/data/warn.txt');
        if (!warnResponse.ok) throw new Error("文件加载失败");
        const warnText = await warnResponse.text();
        const warnLines = warnText.split('\n');
        const totalWarn = warnLines.find(line => line.startsWith('all:')).split(':')[1].trim();
        const todayWarnLine = warnLines.find(line => line.startsWith(today));
        
        let todayWarn = '0';
        if (todayWarnLine) {
            const match = todayWarnLine.match(/day_all:(\d+)/);
            todayWarn = match ? match[1].trim() : '0';
        }

        document.getElementById('total_identify').textContent = totalIdentify;
        document.getElementById('today_identify').textContent = todayIdentify;
        document.getElementById('total_warn').textContent = totalWarn;
        document.getElementById('today_warn').textContent = todayWarn;
    } catch (error) {
        console.error("数据加载失败:", error);
        // 设置默认值
        document.getElementById('total_identify').textContent = '0';
        document.getElementById('today_identify').textContent = '0';
        document.getElementById('total_warn').textContent = '0';
        document.getElementById('today_warn').textContent = '0';
    }
}