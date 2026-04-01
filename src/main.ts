import { StorageService } from './services/StorageService.ts';
import { TimerService } from './services/TimerService.ts';
import { TimerUI } from './components/TimerUI.ts';
import { TagsUI } from './components/TagsUI.ts';
import { StatisticsUI } from './components/StatisticsUI.ts';

async function init() {
    // 1. Initialize Storage
    await StorageService.initDefaults();

    // 2. Request Notification Permission
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    // 3. Initialize Services
    const timerService = new TimerService();

    // 4. Initialize UI Components
    const timerSection = document.getElementById('timer-section')!;
    const tagsSection = document.getElementById('tags-section')!;
    const statsContainer = document.getElementById('stats-container')!;
    
    new TimerUI(timerSection, timerService);
    new TagsUI(tagsSection, timerService);
    const statsUI = new StatisticsUI(statsContainer);

    // Initial load setup
    const tags = await StorageService.getTags();
    if (tags.length > 0) {
        timerService.setTag(tags[0]);
    }

    // Modals
    const btnStatsToggle = document.getElementById('btn-stats-toggle')!;
    const statsModal = document.getElementById('stats-modal')!;
    const btnCloseStats = document.getElementById('btn-close-stats')!;

    btnStatsToggle.addEventListener('click', () => {
        statsModal.classList.remove('hidden');
        statsUI.render();
    });

    btnCloseStats.addEventListener('click', () => {
        statsModal.classList.add('hidden');
    });

    // Tags Modal global close
    const tagsWrapperModal = document.getElementById('tags-wrapper-modal')!;
    const btnCloseTags = document.getElementById('btn-close-tags')!;
    btnCloseTags.addEventListener('click', () => {
        tagsWrapperModal.classList.add('hidden');
    });
}

init();

// PWA Registration is handled by vite-plugin-pwa automatically via virtual module
// Usually you import the registerSW from 'virtual:pwa-register'
// For this template, it will simply autoUpdate.
import { registerSW } from 'virtual:pwa-register';
registerSW({
  onNeedRefresh() {
    // prompt user to refresh
  },
  onOfflineReady() {
    // ready for offline use
  },
});
