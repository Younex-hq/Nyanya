import { StorageService } from "../services/StorageService.ts";
import { TimerService } from "../services/TimerService.ts";
import type { Tag } from "../models/types.ts";

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
            <div class="tags-manager-view" style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="tags-header" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 2rem;">
                    <div style="background: var(--sys-color-primary-container, rgba(208, 188, 255, 0.15)); padding: 1rem; border-radius: 50%; margin-bottom: 1rem;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--sys-color-primary, #d0bcff)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                        </svg>
                    </div>
                    <h2 id="tag-selector-title" style="font-size: 2.2rem; font-weight: 700; margin: 0 0 0.5rem 0; letter-spacing: -0.5px;">Select a Tag</h2>
                    <p style="opacity: 0.6; font-size: 1.05rem; margin: 0; max-width: 400px; text-align: center;">Choose a tag to track your progress and categorize your session.</p>
                </div>

                <div id="tags-list" class="tags-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; padding: 0.5rem;">
                    <!-- Tags will be rendered here -->
                </div>
            </div>
        `;

        // 2. Tag Forge Modal (Top-level)
        const forgeContainer = document.getElementById(
            "tag-forge-modal-container",
        )!;
        forgeContainer.innerHTML = `
            <div id="tag-modal" class="modal hidden">
                <div class="modal-content tag-forge-card" style="max-width: 480px; padding: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; background-color: #1e1e23; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 24px 48px rgba(0,0,0,0.5); border-radius: 24px;">
                    <!-- Header with Preview -->
                    <div class="tag-forge-header" style="height: 110px; background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        <div style="position: absolute; top: -50%; left: -20%; width: 140%; height: 200%; background: radial-gradient(circle at center, var(--sys-color-primary-container) 0%, transparent 70%); opacity: 0.2; pointer-events: none;"></div>
                        
                        <button class="close-button" id="btn-close-tag" style="top: 0.75rem; right: 0.75rem; z-index: 10; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); width: 28px; height: 28px; font-size: 1rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0;">&times;</button>
                        
                        <div class="tag-forge-preview-area" style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                            <h2 id="tag-forge-title" style="margin: 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.2px; color: var(--sys-color-primary); text-transform: none; opacity: 0.9;">Tag Forge</h2>
                            <div id="tag-preview-badge" class="tag-badge" style="transform: scale(0.9); box-shadow: 0 8px 20px rgba(0,0,0,0.3); border-width: 1.5px; margin: 0;">
                                <span class="tag-badge-name" style="font-weight: 700; letter-spacing: 0.5px;">New Tag</span>
                                <span class="tag-session-count" style="background: rgba(255,255,255,0.2); color: white; box-shadow: none;">0</span>
                            </div>
                        </div>
                    </div>

                    <!-- Body with Fields -->
                    <div class="tag-forge-body" style="padding: 1.5rem 1.75rem 1.75rem;">
                        <form id="tag-form" style="display:flex; flex-direction:column; gap: 1.25rem;">
                            <input type="hidden" id="tag-id" />

                            <div class="input-module">
                                <label style="font-size: 0.65rem; text-transform: uppercase; opacity: 0.4; margin-bottom: 0.5rem; display: block; font-weight: 700; letter-spacing: 1px;">Identity</label>
                                <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem;">
                                    <input type="text" id="tag-name" class="input-field" placeholder="Tag Name..." style="flex: 1; margin: 0; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.8rem 1rem; font-weight: 500; font-size: 0.95rem;" required />
                                    <div class="color-picker-wrapper" style="width: 42px; height: 42px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03);">
                                        <input type="color" id="tag-color" value="#d0bcff" style="width: 150%; height: 150%; margin: -25%;" />
                                    </div>
                                </div>
                                <!-- Predefined Colors -->
                                <div id="preset-colors" style="display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; background: rgba(0,0,0,0.15); padding: 0.5rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03);">
                                    <!-- Preset colors injected here -->
                                </div>
                            </div>

                            <div style="background: rgba(255,255,255,0.015); padding: 1.25rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04);">
                                <label style="font-size: 0.65rem; text-transform: uppercase; opacity: 0.4; margin-bottom: 0.75rem; display: block; font-weight: 700; letter-spacing: 1px;">Parameters</label>
                                <div class="setting-module-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                    <div class="setting-module" style="background: rgba(0,0,0,0.1); border-radius: 12px; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 0.25rem;">
                                        <label style="opacity: 0.5; font-size: 0.6rem; margin: 0;">Focus</label>
                                        <div class="input-with-unit" style="align-items: center;">
                                            <input type="number" id="tag-focus" value="25" min="1" required style="font-size: 1.1rem; width: 100%;" />
                                            <span style="opacity: 0.3; font-size: 0.7rem;">min</span>
                                        </div>
                                    </div>
                                    <div class="setting-module" style="background: rgba(0,0,0,0.1); border-radius: 12px; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 0.25rem;">
                                        <label style="opacity: 0.5; font-size: 0.6rem; margin: 0;">Short Break</label>
                                        <div class="input-with-unit" style="align-items: center;">
                                            <input type="number" id="tag-break" value="5" min="1" required style="font-size: 1.1rem; width: 100%;" />
                                            <span style="opacity: 0.3; font-size: 0.7rem;">min</span>
                                        </div>
                                    </div>
                                    <div class="setting-module" style="background: rgba(0,0,0,0.1); border-radius: 12px; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 0.25rem;">
                                        <label style="opacity: 0.5; font-size: 0.6rem; margin: 0;">Long Break</label>
                                        <div class="input-with-unit" style="align-items: center;">
                                            <input type="number" id="tag-longbreak" value="15" min="1" required style="font-size: 1.1rem; width: 100%;" />
                                            <span style="opacity: 0.3; font-size: 0.7rem;">min</span>
                                        </div>
                                    </div>
                                    <div class="setting-module" style="background: rgba(0,0,0,0.1); border-radius: 12px; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 0.25rem;">
                                        <label style="opacity: 0.5; font-size: 0.6rem; margin: 0;">Cycle</label>
                                        <div class="input-with-unit" style="align-items: center;">
                                            <input type="number" id="tag-sessionslb" value="4" min="1" required style="font-size: 1.1rem; width: 100%;" />
                                            <span style="opacity: 0.3; font-size: 0.7rem;">qty</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex; gap: 0.75rem; margin-top: 0.25rem;">
                                <button type="button" id="btn-delete-tag" class="btn-secondary danger-button hidden" style="flex: 1; border: none; background: rgba(242, 184, 181, 0.1) !important; color: #f2b8b5 !important; padding: 0.8rem; font-weight: 600; font-size: 0.9rem; border-radius: 14px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    Discard
                                </button>
                                <button type="submit" class="btn-primary" style="flex: 2; padding: 0.8rem; font-weight: 700; font-size: 1rem; border-radius: 14px; box-shadow: 0 4px 12px var(--sys-color-primary-container); display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                    Save Tag
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.loadTags();
        this.renderPresetColors();
        this.attachEvents();
    }

    private renderPresetColors() {
        const container = document.getElementById("preset-colors")!;
        container.innerHTML = "";

        const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
        
        // HSL (*, 100, 87) pattern
        // As standard HSL is (0-360, 0-100%, 0-100%), I'll interpret this as a light theme
        // matching the primary theme color rgb(189, 226, 255) which is hsl(210, 100%, 87%)
        hues.forEach(hue => {
            // HSL (*, 100%, 87%) which corresponds to the theme's light pastel style
            const color = `hsl(${hue}, 100%, 87%)`;
            const hex = this.hslToHex(hue, 100, 87);
            
            const chip = document.createElement("div");
            chip.style.width = "24px";
            chip.style.height = "24px";
            chip.style.borderRadius = "50%";
            chip.style.backgroundColor = color;
            chip.style.cursor = "pointer";
            chip.style.border = "2px solid transparent";
            chip.style.transition = "transform 0.2s ease, border-color 0.2s ease";
            chip.title = `Hue: ${hue}`;

            chip.addEventListener("click", () => {
                const colorInput = document.getElementById("tag-color") as HTMLInputElement;
                colorInput.value = hex;
                this.updatePreview();
                this.updatePresetHighlights(hex);
            });

            chip.addEventListener("mouseenter", () => {
                chip.style.transform = "scale(1.2)";
            });

            chip.addEventListener("mouseleave", () => {
                chip.style.transform = "scale(1)";
            });

            container.appendChild(chip);
        });
    }

    private hslToHex(h: number, s: number, l: number) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    public async loadTags() {
        this.tags = await StorageService.getTags();
        this.renderList();

        // Ensure TimerService has a valid tag if it was cleared
        const activeTagId = this.timerService.activeTag?.id;
        const exists = this.tags.some(t => t.id === activeTagId);
        if (!exists && this.tags.length > 0) {
            this.timerService.setTag(this.tags[0]);
        }
    }

    private async renderList() {
        const list = document.getElementById("tags-list")!;
        list.innerHTML = "";

        const counts = await this.timerService.getTodayCountsByTag();

        this.tags.forEach((tag) => {
            const el = document.createElement("div");
            el.className = "tag-card interactive-tag";
            el.style.cursor = "pointer";
            el.style.backgroundColor = "var(--sys-color-surface)";
            el.style.border = `1px solid ${tag.color}40`;
            el.style.borderRadius = "16px";
            el.style.padding = "1.25rem";
            el.style.display = "flex";
            el.style.flexDirection = "column";
            el.style.gap = "0.5rem";
            el.style.position = "relative";
            el.style.transition = "all 0.2s ease";
            el.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";

            // Hover effect handled by CSS via class .tag-card:hover

            // Determine active outline (only in selection mode)
            if (
                !this.isManagementMode &&
                this.timerService.activeTag?.id === tag.id
            ) {
                el.style.border = `2px solid ${tag.color}`;
                el.style.backgroundColor = `${tag.color}15`;
                el.style.boxShadow = `0 0 20px ${tag.color}40, 0 4px 12px rgba(0,0,0,0.3)`;
            }

            const count = counts[tag.name] || 0;
            el.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${tag.color}; box-shadow: 0 0 10px ${tag.color};"></div>
                    ${
                        this.isManagementMode
                            ? `
                    <button class="btn-edit-tag" title="Edit Tag" style="background: transparent; border: none; color: var(--sys-color-on-surface); opacity: 0.5; padding: 0; cursor: pointer; transition: opacity 0.2s;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    `
                            : ""
                    }
                </div>
                <div style="margin-top: 0.5rem;">
                    <div style="font-size: 1.1rem; font-weight: 600; color: var(--sys-color-on-surface); margin-bottom: 0.25rem;">${tag.name}</div>
                    <div style="font-size: 0.85rem; opacity: 0.6; display: flex; align-items: center; gap: 0.25rem;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                        </svg>
                        ${count} session${count !== 1 ? 's' : ''} today
                    </div>
                </div>
            `;

            el.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.isManagementMode) {
                    this.openEditModal(tag);
                } else {
                    this.timerService.setTag(tag);
                    this.renderList(); // re-render to show active
                    history.back();
                }
            });

            // Edit button specific listener
            if (this.isManagementMode) {
                el.querySelector(".btn-edit-tag")?.addEventListener(
                    "click",
                    (e) => {
                        e.stopPropagation();
                        this.openEditModal(tag);
                    },
                );
            }

            list.appendChild(el);
        });

        // Add "New Tag" button as a card in the grid
        const addEl = document.createElement("div");
        addEl.className = "tag-card add-tag-card interactive-tag";
        addEl.id = "btn-add-tag";
        addEl.style.cursor = "pointer";
        addEl.style.border = "2px dashed rgba(255, 255, 255, 0.2)";
        addEl.style.borderRadius = "16px";
        addEl.style.backgroundColor = "transparent";
        addEl.style.color = "var(--sys-color-primary, #d0bcff)";
        addEl.style.display = "flex";
        addEl.style.flexDirection = "column";
        addEl.style.justifyContent = "center";
        addEl.style.alignItems = "center";
        addEl.style.minHeight = "120px";
        addEl.style.gap = "0.5rem";
        addEl.style.transition = "all 0.2s ease";

        addEl.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span style="font-weight: 600; font-size: 0.9rem;">Add New Tag</span>
        `;
        
        list.appendChild(addEl);

        // Re-attach the add button event since we re-created the element
        addEl.addEventListener("click", () => {
            const form = document.getElementById("tag-form") as HTMLFormElement;
            const modal = document.getElementById("tag-modal")!;
            form.reset();
            const nameInput = document.getElementById("tag-name") as HTMLInputElement;
            nameInput.disabled = false;
            nameInput.title = "";
            (document.getElementById("tag-id") as HTMLInputElement).value = "";
            document.getElementById("tag-forge-title")!.textContent =
                "Create Tag";
            document.getElementById("btn-delete-tag")!.classList.add("hidden");
            this.updatePreview();
            this.updatePresetHighlights("");
            location.hash = 'forge';
        });
    }

    private updatePresetHighlights(hex: string) {
        const container = document.getElementById("preset-colors");
        if (!container) return;
        
        container.querySelectorAll("div").forEach(chip => {
            const chipColor = chip.style.backgroundColor;
            // chipColor is usually rgb(...) but could be hex or hsl depending on browser
            // We'll compare hex values
            const chipHex = this.rgbToHex(chipColor);
            if (chipHex.toLowerCase() === hex.toLowerCase()) {
                chip.style.borderColor = "white";
            } else {
                chip.style.borderColor = "transparent";
            }
        });
    }

    private rgbToHex(rgb: string) {
        if (rgb.startsWith('#')) return rgb;
        // Handle both rgb and rgba
        const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
        if (!match) return "";
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    private attachEvents() {
        const modal = document.getElementById("tag-modal")!;
        const btnClose = document.getElementById("btn-close-tag")!;
        const form = document.getElementById("tag-form") as HTMLFormElement;

        // Live Preview Listeners
        const nameInput = document.getElementById(
            "tag-name",
        ) as HTMLInputElement;
        const colorInput = document.getElementById(
            "tag-color",
        ) as HTMLInputElement;
        nameInput.addEventListener("input", () => this.updatePreview());
        colorInput.addEventListener("input", () => {
            this.updatePreview();
            this.updatePresetHighlights(colorInput.value);
        });

        btnClose.addEventListener("click", () => {
            history.back();
        });

        // Optional: add a backdrop click handler to tag-modal for consistency
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                history.back();
            }
        });

        const btnDelete = document.getElementById("btn-delete-tag")!;
        btnDelete.addEventListener("click", async () => {
            const idVal = (
                document.getElementById("tag-id") as HTMLInputElement
            ).value;
            if (
                idVal &&
                window.confirm(
                    "Are you sure you want to delete this tag? Historical data will remain, but the tag preset will be lost.",
                )
            ) {
                const id = parseInt(idVal);
                await StorageService.deleteTag(id);

                // Sync with TimerService
                if (this.timerService.activeTag?.id === id) {
                    this.timerService.activeTag = null;
                }

                await this.loadTags();
                history.back();
            }
        });

        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const idVal = (
                document.getElementById("tag-id") as HTMLInputElement
            ).value;
            const newTag: Tag = {
                id: idVal ? parseInt(idVal) : undefined,
                name: (document.getElementById("tag-name") as HTMLInputElement)
                    .value,
                color: (
                    document.getElementById("tag-color") as HTMLInputElement
                ).value,
                focusTime: parseInt(
                    (document.getElementById("tag-focus") as HTMLInputElement)
                        .value,
                ),
                breakTime: parseInt(
                    (document.getElementById("tag-break") as HTMLInputElement)
                        .value,
                ),
                longBreakTime: parseInt(
                    (
                        document.getElementById(
                            "tag-longbreak",
                        ) as HTMLInputElement
                    ).value,
                ),
                sessionsBeforeLongBreak: parseInt(
                    (
                        document.getElementById(
                            "tag-sessionslb",
                        ) as HTMLInputElement
                    ).value,
                ),
            };

            await StorageService.saveTag(newTag);
            await this.loadTags();

            // if it was the active tag, update service
            if (this.timerService.activeTag?.id === newTag.id) {
                this.timerService.setTag(newTag);
            }
            
            history.back();
        });

        this.timerService.addEventListener("change", () => {
            // Only re-render if the tags modal is actually visible to prevent flickering
            const modal = document.getElementById("tags-wrapper-modal");
            // Check if modal is truly visible (not hidden and has opacity > 0 or display != none)
            const isVisible = modal && !modal.classList.contains("hidden") && window.getComputedStyle(modal).display !== 'none';
            if (isVisible) {
                // Instead of a full re-render, we could selectively update, but since the only thing that changes frequently is the count...
                // Actually, the timer ticks every second, so "change" fires every second.
                // We only need to re-render the list when a session *completes*, not every tick.
                // However, since we don't have a specific "session complete" event, let's just avoid re-rendering while the timer is actively ticking, 
                // because session counts only update when a session ends.
                const state = this.timerService.getState();
                if (state !== 'Focus' && state !== 'Break' && state !== 'FocusPaused' && state !== 'BreakPaused') {
                    this.renderList();
                }
            }
        });
    }

    private openEditModal(tag: Tag) {
        const modal = document.getElementById("tag-modal")!;
        const form = document.getElementById("tag-form") as HTMLFormElement;
        const btnDelete = document.getElementById("btn-delete-tag")!;
        const nameInput = document.getElementById("tag-name") as HTMLInputElement;

        form.reset();
        document.getElementById("tag-forge-title")!.textContent =
            "Edit Tag";
        (document.getElementById("tag-id") as HTMLInputElement).value =
            tag.id!.toString();
        nameInput.value = tag.name;
        (document.getElementById("tag-color") as HTMLInputElement).value =
            tag.color;
        (document.getElementById("tag-focus") as HTMLInputElement).value =
            tag.focusTime.toString();
        (document.getElementById("tag-break") as HTMLInputElement).value =
            tag.breakTime.toString();
        (document.getElementById("tag-longbreak") as HTMLInputElement).value =
            tag.longBreakTime.toString();
        (document.getElementById("tag-sessionslb") as HTMLInputElement).value =
            tag.sessionsBeforeLongBreak.toString();

        // Restrictions for the default Pomodoro tag
        if (tag.name === 'Pomodoro') {
            nameInput.disabled = true;
            nameInput.title = "Default tag name cannot be changed";
            btnDelete.classList.add("hidden");
        } else {
            nameInput.disabled = false;
            nameInput.title = "";
            btnDelete.classList.remove("hidden");
        }

        this.updatePreview();
        this.updatePresetHighlights(tag.color);
        document.getElementById("tags-wrapper-modal")?.classList.add("hidden");
        modal.classList.remove("hidden");
    }

    private updatePreview() {
        const name =
            (document.getElementById("tag-name") as HTMLInputElement).value ||
            "New Tag";
        const color = (document.getElementById("tag-color") as HTMLInputElement)
            .value;
        const preview = document.getElementById("tag-preview-badge")!;

        const previewName = preview.querySelector(".tag-badge-name")!;
        previewName.textContent = name;
        preview.style.backgroundColor = color;
    }

    public setManagementMode(enabled: boolean) {
        this.isManagementMode = enabled;
        this.renderList();
    }
}
