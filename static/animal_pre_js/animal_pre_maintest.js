import { initializeHistoryModal } from './animal_pre_historymodal.js';
import { initializeWarnModal } from './animal_pre_popup.js';
import { fetchDataAndUpdateStats } from './data_board.js'; 

function initializePage() {
    initializeWarnModal();
    
    const historyModal = document.getElementById('historyModal');
    const historyBtn = document.getElementById('historyButton');

    if (historyModal && historyBtn) {  
        initializeHistoryModal();
    }

    // 调用 fetchDataAndUpdateStats
    fetchDataAndUpdateStats();
}

// 页面加载完成后，初始化所有模块
window.addEventListener('DOMContentLoaded', initializePage);