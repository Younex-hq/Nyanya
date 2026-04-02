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
    
    const tagsUI = new TagsUI(tagsSection, timerService);
    new TimerUI(timerSection, timerService, tagsUI);
    const statsUI = new StatisticsUI(statsContainer, tagsUI);

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
        location.hash = 'stats';
    });

    btnCloseStats.addEventListener('click', () => {
        history.back();
    });

    // Close on backdrop click
    statsModal.addEventListener('click', (e) => {
        if (e.target === statsModal) {
            history.back();
        }
    });

    // Tags Modal global close
    const tagsWrapperModal = document.getElementById('tags-wrapper-modal')!;
    const btnCloseTags = document.getElementById('btn-close-tags')!;
    btnCloseTags.addEventListener('click', () => {
        history.back();
    });

    // Tags Modal backdrop click
    tagsWrapperModal.addEventListener('click', (e) => {
        if (e.target === tagsWrapperModal) {
            history.back();
        }
    });

    // Hash Router for Modals
    window.addEventListener('hashchange', () => {
        const hash = location.hash.replace('#', '');
        const tagModal = document.getElementById('tag-modal'); // Might be created by TagsUI
        
        // Hide all first
        statsModal.classList.add('hidden');
        tagsWrapperModal.classList.add('hidden');
        if (tagModal) tagModal.classList.add('hidden');
        
        // Show specific modal based on hash
        if (hash === 'stats') {
            statsModal.classList.remove('hidden');
            statsUI.render();
        } else if (hash === 'tags') {
            tagsWrapperModal.classList.remove('hidden');
        } else if (hash === 'forge') {
            if (tagModal) tagModal.classList.remove('hidden');
        }
    });

    // Initialize hash state if the user loaded the page with a hash
    if (location.hash) {
        window.dispatchEvent(new Event('hashchange'));
    }
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
