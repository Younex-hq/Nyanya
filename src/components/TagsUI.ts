import { StorageService } from '../services/StorageService.ts';
import { TimerService } from '../services/TimerService.ts';
import type { Tag } from '../models/types.ts';

export class TagsUI {
    private container: HTMLElement;
    private timerService: TimerService;
    private tags: Tag[] = [];

    constructor(container: HTMLElement, timerService: TimerService) {
        this.container = container;
        this.timerService = timerService;
        this.initialize();
    }

    private async initialize() {
        this.container.innerHTML = `
            <div class="card">
                <h2>Tags</h2>
                <div id="tags-list" style="display:flex; flex-wrap:wrap; gap: 0.5rem; margin-bottom: 1rem;"></div>
                <button class="btn-secondary" id="btn-add-tag">Add New Tag</button>
            </div>

            <!-- Tag Form Modal -->
            <div id="tag-modal" class="modal hidden">
                <div class="modal-content">
                    <button class="close-button" id="btn-close-tag">&times;</button>
                    <h2 id="tag-modal-title">Create Tag</h2>
                    <form id="tag-form" style="display:flex; flex-direction:column; gap: 1rem;">
                        <input type="hidden" id="tag-id" />
                        
                        <label>Name</label>
                        <input type="text" id="tag-name" class="input-field" required />
                        
                        <label>Color</label>
                        <input type="color" id="tag-color" value="#d0bcff" style="width: 100%; height: 40px; border: none;" />
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div>
                                <label>Focus (min)</label>
                                <input type="number" id="tag-focus" class="input-field" value="25" min="1" required />
                            </div>
                            <div>
                                <label>Break (min)</label>
                                <input type="number" id="tag-break" class="input-field" value="5" min="1" required />
                            </div>
                            <div>
                                <label>Long Break (min)</label>
                                <input type="number" id="tag-longbreak" class="input-field" value="15" min="1" required />
                            </div>
                            <div>
                                <label>Sessions before LB</label>
                                <input type="number" id="tag-sessionslb" class="input-field" value="4" min="1" required />
                            </div>
                        </div>
                        
                        <button type="submit" class="btn-primary" style="margin-top: 1rem;">Save Tag</button>
                    </form>
                </div>
            </div>
        `;

        await this.loadTags();
        this.attachEvents();
    }

    private async loadTags() {
        this.tags = await StorageService.getTags();
        this.renderList();
    }

    private renderList() {
        const list = document.getElementById('tags-list')!;
        list.innerHTML = '';
        
        this.tags.forEach(tag => {
            const el = document.createElement('div');
            el.className = 'tag-badge';
            el.style.backgroundColor = tag.color;
            el.style.cursor = 'pointer';
            // Determine active outline
            if (this.timerService.activeTag?.id === tag.id) {
                el.style.border = '2px solid white';
            }
            el.textContent = tag.name;
            
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.timerService.setTag(tag);
                this.renderList(); // re-render to show active
            });
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
            form.reset();
            (document.getElementById('tag-id') as HTMLInputElement).value = '';
            document.getElementById('tag-modal-title')!.textContent = 'Create Tag';
            modal.classList.remove('hidden');
        });

        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
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
            
            // if it was the active tag, update service
            if (this.timerService.activeTag?.id === newTag.id) {
                this.timerService.setTag(newTag);
            }
        });
        
        this.timerService.addEventListener('change', () => this.renderList());
    }
}
