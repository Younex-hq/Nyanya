import { StorageService } from '../services/StorageService.ts';
import { TimerService } from '../services/TimerService.ts';
import type { Tag } from '../models/types.ts';

export class TagsUI {
    private container: HTMLElement;
    private timerService: TimerService;
    private tags: Tag[] = [];
    private isManagementMode: boolean = false;

    constructor(container: HTMLElement, timerService: TimerService) {
        this.container = container;
        this.timerService = timerService;
        this.initialize();
    }

    private initialize() {
        // 1. Tag Selector List (In the wrapper)
        this.container.innerHTML = `
            <div class="tags-manager-view">
                <div class="tags-header" style="text-align: center; margin-bottom: 2.5rem;">
                    <h2 id="tag-modal-title" style="font-size: 2rem; margin-bottom: 0.5rem;">Select Focus Task</h2>
                    <p style="opacity: 0.7; font-size: 1rem;">What are we working on today?</p>
                </div>
                
                <div id="tags-list" class="tags-grid">
                    <!-- Tags will be rendered here -->
                </div>

                <div style="display: flex; justify-content: center; margin-top: 3rem;">
                    <button class="btn-primary" id="btn-add-tag" style="padding: 1rem 2.5rem;">+ Add New Tag</button>
                </div>
            </div>
        `;

        // 2. Tag Forge Modal (Top-level)
        const forgeContainer = document.getElementById('tag-forge-modal-container')!;
        forgeContainer.innerHTML = `
            <div id="tag-modal" class="modal hidden">
                <div class="modal-content tag-forge-card" style="max-width: 500px; padding: 0; overflow: hidden;">
                    <!-- Header with Preview -->
                    <div class="tag-forge-header">
                        <button class="close-button" id="btn-close-tag" style="top: 0.5rem; right: 0.5rem; z-index: 10;">&times;</button>
                        <div class="tag-forge-preview-area">
                            <div id="tag-preview-badge" class="tag-badge" style="transform: scale(1.2); box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                                <span class="tag-badge-name">New Tag</span>
                                <span class="tag-session-count">0</span>
                            </div>
                        </div>
                    </div>

                    <!-- Body with Fields -->
                    <div class="tag-forge-body" style="padding: 2rem;">
                        <h2 id="tag-modal-title" style="margin-bottom: 2rem; text-align: center; font-size: 1.5rem; letter-spacing: 1px;">TAG FORGE</h2>
                        
                        <form id="tag-form" style="display:flex; flex-direction:column; gap: 1.5rem;">
                            <input type="hidden" id="tag-id" />
                            
                            <div class="input-module">
                                <label style="font-size: 0.8rem; text-transform: uppercase; opacity: 0.6; margin-bottom: 0.5rem; display: block;">Identity</label>
                                <div style="display: flex; gap: 1rem; align-items: center;">
                                    <input type="text" id="tag-name" class="input-field" placeholder="Tag Name..." style="flex: 1; margin: 0; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);" required />
                                    <div class="color-picker-wrapper">
                                        <input type="color" id="tag-color" value="#d0bcff" />
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div class="setting-module">
                                    <label>Focus</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="tag-focus" value="25" min="1" required />
                                        <span>min</span>
                                    </div>
                                </div>
                                <div class="setting-module">
                                    <label>Break</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="tag-break" value="5" min="1" required />
                                        <span>min</span>
                                    </div>
                                </div>
                                <div class="setting-module">
                                    <label>Long Break</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="tag-longbreak" value="15" min="1" required />
                                        <span>min</span>
                                    </div>
                                </div>
                                <div class="setting-module">
                                    <label>Sessions</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="tag-sessionslb" value="4" min="1" required />
                                        <span>qty</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display:flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
                                <button type="submit" class="btn-primary" style="width: 100%; padding: 1.25rem;">Save Categorization</button>
                                <button type="button" id="btn-delete-tag" class="btn-secondary danger-button hidden" style="width: 100%; border: none; background: rgba(255,0,0,0.1); color: #ff5555;">Discard Tag</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.loadTags();
        this.attachEvents();
    }

    private async loadTags() {
        this.tags = await StorageService.getTags();
        this.renderList();
    }

    private async renderList() {
        const list = document.getElementById('tags-list')!;
        list.innerHTML = '';
        
        const counts = await this.timerService.getTodayCountsByTag();

        this.tags.forEach(tag => {
            const el = document.createElement('div');
            el.className = 'tag-badge interactive-tag';
            el.style.backgroundColor = tag.color;
            el.style.cursor = 'pointer';
            
            // Determine active outline (only in selection mode)
            if (!this.isManagementMode && this.timerService.activeTag?.id === tag.id) {
                el.style.border = '2px solid white';
                el.style.boxShadow = `0 0 20px ${tag.color}80, 0 4px 12px rgba(0,0,0,0.3)`;
            }
            
            const count = counts[tag.name] || 0;
            el.innerHTML = `
                <span class="tag-badge-name">${tag.name}</span>
                <span class="tag-session-count">${count}</span>
                ${this.isManagementMode ? `
                <button class="btn-edit-tag" title="Edit Tag" style="margin-left: 0.5rem;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                ` : ''}
            `;
            
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isManagementMode) {
                    this.openEditModal(tag);
                } else {
                    this.timerService.setTag(tag);
                    this.renderList(); // re-render to show active
                    document.getElementById('tags-wrapper-modal')?.classList.add('hidden');
                }
            });

            // Edit button specific listener
            if (this.isManagementMode) {
                el.querySelector('.btn-edit-tag')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openEditModal(tag);
                });
            }

            list.appendChild(el);
        });
        
        // Re-render when timer service changes if we want to ensure sync, 
        // but simple click sync is fine here.
    }

    private attachEvents() {
        const btnAdd = document.getElementById('btn-add-tag')!;
        const modal = document.getElementById('tag-modal')!;
        const btnClose = document.getElementById('btn-close-tag')!;
        const form = document.getElementById('tag-form') as HTMLFormElement;

        btnAdd.addEventListener('click', () => {
            document.getElementById('tags-wrapper-modal')?.classList.add('hidden');
            form.reset();
            (document.getElementById('tag-id') as HTMLInputElement).value = '';
            document.getElementById('tag-modal-title')!.textContent = 'Create Tag';
            document.getElementById('btn-delete-tag')!.classList.add('hidden');
            this.updatePreview();
            modal.classList.remove('hidden');
        });

        // Live Preview Listeners
        const nameInput = document.getElementById('tag-name') as HTMLInputElement;
        const colorInput = document.getElementById('tag-color') as HTMLInputElement;
        nameInput.addEventListener('input', () => this.updatePreview());
        colorInput.addEventListener('input', () => this.updatePreview());

        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (this.isManagementMode) {
                document.getElementById('tags-wrapper-modal')?.classList.remove('hidden');
            }
        });

        const btnDelete = document.getElementById('btn-delete-tag')!;
        btnDelete.addEventListener('click', async () => {
            const idVal = (document.getElementById('tag-id') as HTMLInputElement).value;
            if (idVal && window.confirm('Are you sure you want to delete this tag? Historical data will remain, but the tag preset will be lost.')) {
                const id = parseInt(idVal);
                await StorageService.deleteTag(id);
                
                // Sync with TimerService
                if (this.timerService.activeTag?.id === id) {
                    this.timerService.activeTag = null;
                }
                
                await this.loadTags();
                modal.classList.add('hidden');
                if (this.isManagementMode) {
                    document.getElementById('tags-wrapper-modal')?.classList.remove('hidden');
                }
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const idVal = (document.getElementById('tag-id') as HTMLInputElement).value;
            const newTag: Tag = {
                id: idVal ? parseInt(idVal) : undefined,
                name: (document.getElementById('tag-name') as HTMLInputElement).value,
                color: (document.getElementById('tag-color') as HTMLInputElement).value,
                focusTime: parseInt((document.getElementById('tag-focus') as HTMLInputElement).value),
                breakTime: parseInt((document.getElementById('tag-break') as HTMLInputElement).value),
                longBreakTime: parseInt((document.getElementById('tag-longbreak') as HTMLInputElement).value),
                sessionsBeforeLongBreak: parseInt((document.getElementById('tag-sessionslb') as HTMLInputElement).value),
            };

            await StorageService.saveTag(newTag);
            await this.loadTags();
            modal.classList.add('hidden');
            
            if (this.isManagementMode) {
                document.getElementById('tags-wrapper-modal')?.classList.remove('hidden');
            }
            
            // if it was the active tag, update service
            if (this.timerService.activeTag?.id === newTag.id) {
                this.timerService.setTag(newTag);
            }
        });
        
        this.timerService.addEventListener('change', () => this.renderList());
    }

    private openEditModal(tag: Tag) {
        const modal = document.getElementById('tag-modal')!;
        const form = document.getElementById('tag-form') as HTMLFormElement;
        const btnDelete = document.getElementById('btn-delete-tag')!;
        
        form.reset();
        document.getElementById('tag-modal-title')!.textContent = 'Edit Tag';
        (document.getElementById('tag-id') as HTMLInputElement).value = tag.id!.toString();
        (document.getElementById('tag-name') as HTMLInputElement).value = tag.name;
        (document.getElementById('tag-color') as HTMLInputElement).value = tag.color;
        (document.getElementById('tag-focus') as HTMLInputElement).value = tag.focusTime.toString();
        (document.getElementById('tag-break') as HTMLInputElement).value = tag.breakTime.toString();
        (document.getElementById('tag-longbreak') as HTMLInputElement).value = tag.longBreakTime.toString();
        (document.getElementById('tag-sessionslb') as HTMLInputElement).value = tag.sessionsBeforeLongBreak.toString();
        
        btnDelete.classList.remove('hidden');
        this.updatePreview();
        document.getElementById('tags-wrapper-modal')?.classList.add('hidden');
        modal.classList.remove('hidden');
    }

    private updatePreview() {
        const name = (document.getElementById('tag-name') as HTMLInputElement).value || 'New Tag';
        const color = (document.getElementById('tag-color') as HTMLInputElement).value;
        const preview = document.getElementById('tag-preview-badge')!;
        
        const previewName = preview.querySelector('.tag-badge-name')!;
        previewName.textContent = name;
        preview.style.backgroundColor = color;
    }

    public setManagementMode(enabled: boolean) {
        this.isManagementMode = enabled;
        this.renderList();
    }
}
