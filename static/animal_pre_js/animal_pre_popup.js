const animalList = [
    "熊", "棕熊", "公牛", "蝴蝶", "骆驼", "金丝雀", "毛毛虫", "牛", "蜈蚣", 
    "猎豹", "鸡", "螃蟹", "鳄鱼", "鹿", "鸭子", "鹰", "大象", "鱼", "狐狸", 
    "青蛙", "长颈鹿", "山羊", "金鱼", "鹅", "仓鼠", "港海豹", "刺猬", "河马", 
    "马", "美洲虎", "水母", "袋鼠", "考拉", "瓢虫", "豹", "狮子", "蜥蜴", "猞猁", 
    "喜鹊", "猴子", "蛾和蝴蝶", "老鼠", "骡子", "鸵鸟", "水獭", "猫头鹰", "熊猫", 
    "鹦鹉", "企鹅", "猪", "北极熊", "兔子", "浣熊", "渡鸦", "小熊猫", "犀牛", "蝎子", 
    "海狮", "海龟", "海马", "鲨鱼", "羊", "虾", "蜗牛", "蛇", "麻雀", "蜘蛛", "鱿鱼", 
    "松鼠", "海星", "天鹅", "蜱虫", "老虎", "陆龟", "火鸡", "海龟", "鲸鱼", "啄木鸟", 
    "蠕虫", "斑马"
];

let animalStatus = new Array(animalList.length).fill(0);

export function initializeWarnModal() {
    const warnBtn = document.getElementById('warnBtn');
    const modal = document.getElementById('warnModal');
    const closeBtn = document.querySelector('.warn-close');
    const animalContainer = document.getElementById('animalButtons');

    // 添加初始状态获取
    fetchInitialStatus();

    animalContainer.innerHTML = '';
    animalList.forEach((name, index) => {
        const btn = document.createElement('button');
        btn.classList.add('animal-button');
        btn.textContent = name;

        btn.addEventListener('click', (e) => {
            e.preventDefault();  // 阻止默认行为
            e.stopPropagation(); // 阻止事件冒泡
            animalStatus[index] = animalStatus[index] === 0 ? 1 : 0;
            btn.classList.toggle('selected');
            syncToServer();
        });

        animalContainer.appendChild(btn);
    });

    // 打开弹窗
    warnBtn.addEventListener('click', (e) => {
        e.preventDefault();  // 阻止默认行为
        modal.style.display = 'flex';
        fetchInitialStatus();  // 每次打开时重新获取状态
    });

    // 只有点击关闭按钮时才关闭弹窗
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();  // 阻止默认行为
        modal.style.display = 'none';
    });

    // 阻止点击弹窗背景时关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
}

// 添加按钮状态更新函数
function updateButtonStates() {
    const buttons = document.querySelectorAll('.animal-button');
    buttons.forEach((btn, index) => {
        if (animalStatus[index] === 1) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// 添加初始状态获取函数
async function fetchInitialStatus() {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/alert/status");
        const data = await response.json();
        if (data.status) {
            animalStatus = data.status;
            updateButtonStates();
        }
    } catch (error) {
        console.error("获取初始状态失败:", error);
    }
}

function syncToServer() {
    fetch("http://127.0.0.1:8000/api/alert/update", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: animalStatus })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => Promise.reject(err));
        }
        return res.json();
    })
    .then(data => {
        console.log("状态更新成功");
        // 移除这里的 modal.style.display = 'none';
    })
    .catch(error => {
        console.error("更新状态失败:", error);
    });
}
