import Chart from 'chart.js/auto';
import { StorageService } from '../services/StorageService.ts';
import { StatisticsHelpers } from '../utils/StatisticsHelpers.ts';
import type { Session, Tag } from '../models/types.ts';

export class StatisticsUI {
    private container: HTMLElement;
    private ringChartInstance: Chart | null = null;
    private lineChartInstance: Chart | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.initialize();
    }

    private initialize() {
        this.container.innerHTML = `
            <div class="stats-dashboard">
                <!-- 1. Today Stats -->
                <div class="stats-group-container">
                    <div class="stat-card minimal-card">
                        <h3>Today's Overview</h3>
                        <div class="stat-horizontal-row">
                            <div class="stat-box"><span>Focus</span> <strong id="stat-today-focus">00:00</strong></div>
                            <div class="stat-box"><span>Break</span> <strong id="stat-today-break">00:00</strong></div>
                            <div class="stat-box"><span>Interruptions</span> <strong id="stat-today-int">00:00</strong></div>
                        </div>
                    </div>
                    
                    <div class="stat-card heatmap-container">
                        <h3>Productive Hours (Today)</h3>
                        <div id="heatmap-container-inner" style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <div class="heatmap-grid daily-heatmap" id="heatmap-hours"></div>
                            <div class="heatmap-labels daily-labels" id="heatmap-labels"></div>
                        </div>
                    </div>
                </div>

                <!-- 2. Historical Analysis (Unified Range) -->
                <div class="stats-group-container">
                    <div class="stat-card minimal-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <h3>Range Analysis</h3>
                            <select id="stat-range-select" class="input-field" style="width: auto; padding: 0.25rem; margin: 0; font-size: 0.8rem;">
                                <option value="today">Today</option>
                                <option value="week">Week</option>
                                <option value="month">Month</option>
                                <option value="total" selected>Total</option>
                            </select>
                        </div>
                        <div class="stat-horizontal-row">
                            <div class="stat-box"><span>Focus</span> <strong id="stat-range-focus">00:00</strong></div>
                            <div class="stat-box"><span>Break</span> <strong id="stat-range-break">00:00</strong></div>
                            <div class="stat-box"><span>Interruptions</span> <strong id="stat-range-int">00:00</strong></div>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>Distribution</h3>
                            <div style="max-width: 300px; width: 100%; margin: 0 auto;">
                                <canvas id="chart-ring"></canvas>
                            </div>
                        </div>
                        <div class="stat-card">
                            <h3>Focus vs Interruptions</h3>
                            <div style="width: 100%; height: 260px;">
                                <canvas id="chart-line"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <h3 style="margin-bottom: 1rem;">Timeline</h3>
                    <div id="timeline-list" class="timeline-list"></div>
                </div>

                <div class="stat-card heatmap-container" style="margin-top: 1rem;">
                    <h3>Yearly Focus Activity</h3>
                    <div class="heatmap-wrapper" style="overflow-x: auto; display: flex; gap: 0.5rem; padding: 0.5rem 0;">
                        <div class="heatmap-day-labels" style="display: grid; grid-template-rows: repeat(7, 12px); gap: 3px; font-size: 0.65rem; opacity: 0.6; padding-top: 1.25rem;">
                            <div></div> <!-- Sun -->
                            <div>Mon</div>
                            <div></div> <!-- Tue -->
                            <div>Wed</div>
                            <div></div> <!-- Thu -->
                            <div>Fri</div>
                            <div></div> <!-- Sat -->
                        </div>
                        <div style="flex: 1;">
                            <div id="heatmap-month-labels" style="display: grid; grid-auto-columns: 12px; grid-auto-flow: column; gap: 3px; font-size: 0.65rem; opacity: 0.6; height: 1.25rem; align-items: end;"></div>
                            <div class="yearly-heatmap-grid" id="heatmap-yearly" style="padding: 0;"></div>
                        </div>
                    </div>
                </div>

                <!-- 3. Actions Button Row Footer -->
                <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; padding: 2rem 0 1rem; border-top: 1px solid rgba(255, 255, 255, 0.05); margin-top: 1rem;">
                    <button class="btn-secondary" id="btn-clear-data-bottom" style="padding: 0.5rem 1.5rem; font-size: 0.9rem; border-color: rgba(242, 184, 181, 0.4); color: #f2b8b5;">Clear All Data</button>
                    <button class="btn-secondary" id="btn-export-json-bottom" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;">Export JSON</button>
                    <button class="btn-secondary" id="btn-import-json-bottom" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;">Import JSON</button>
                    <input type="file" id="input-import-json" accept=".json" class="hidden" />
                </div>
            </div>
        `;

        document.getElementById('btn-export-json-bottom')!.addEventListener('click', () => {
            StorageService.exportData();
        });

        const btnImport = document.getElementById('btn-import-json-bottom')!;
        const inputImport = document.getElementById('input-import-json') as HTMLInputElement;

        btnImport.addEventListener('click', () => {
            inputImport.click();
        });

        inputImport.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const json = ev.target?.result as string;
                    try {
                        await StorageService.importData(json);
                        alert('Import successful!');
                        this.render();
                    } catch (err) {
                        alert('Import failed. Please check the JSON format.');
                    }
                };
                reader.readAsText(file);
            }
        });

        document.getElementById('btn-clear-data-bottom')!.addEventListener('click', async () => {
            if (window.confirm('Are you sure you want to clear all session data? This cannot be undone.')) {
                await StorageService.clearSessions();
                this.render();
            }
        });

        document.getElementById('stat-range-select')!.addEventListener('change', () => {
            this.render();
        });
    }

    public async render() {
        const sessions = await StorageService.getSessions();
        const tags = await StorageService.getTags();
        const tagMap = new Map(tags.map(t => [t.name, t]));

        const todaySessions = StatisticsHelpers.getTodaySessions(sessions);
        
        document.getElementById('stat-today-focus')!.textContent = StatisticsHelpers.formatDecimalMinutesToHHMMSS(StatisticsHelpers.getFocusTimeMin(todaySessions));
        document.getElementById('stat-today-break')!.textContent = StatisticsHelpers.formatDecimalMinutesToHHMMSS(StatisticsHelpers.getBreakTimeMin(todaySessions));
        document.getElementById('stat-today-int')!.textContent = StatisticsHelpers.formatDecimalMinutesToHHMMSS(StatisticsHelpers.getInterruptionsMin(todaySessions));

        const rangeStr = (document.getElementById('stat-range-select') as HTMLSelectElement).value as any;
        const rangeSessions = StatisticsHelpers.filterByRange(sessions, rangeStr);
        document.getElementById('stat-range-focus')!.textContent = StatisticsHelpers.formatDecimalMinutesToHHMMSS(StatisticsHelpers.getFocusTimeMin(rangeSessions));
        document.getElementById('stat-range-break')!.textContent = StatisticsHelpers.formatDecimalMinutesToHHMMSS(StatisticsHelpers.getBreakTimeMin(rangeSessions));
        document.getElementById('stat-range-int')!.textContent = StatisticsHelpers.formatDecimalMinutesToHHMMSS(StatisticsHelpers.getInterruptionsMin(rangeSessions));

        this.renderGraphs(rangeSessions, tagMap);
        this.renderProductiveHours(sessions, tagMap);
        this.renderTimeline(rangeSessions.filter(s => !s.is_break), tagMap);
        this.renderYearlyHeatmap(sessions);
    }

    private renderGraphs(rangeSessions: Session[], tagMap: Map<string, Tag>) {
        const focusSessions = rangeSessions.filter(s => !s.is_break);
        
        // Ring Graph
        const groupedByTag: Record<string, number> = {};
        for(const s of focusSessions) {
            groupedByTag[s.label] = (groupedByTag[s.label] || 0) + s.duration;
        }

        const labels = Object.keys(groupedByTag);
        const data = Object.values(groupedByTag);
        const bgColors = labels.map(l => tagMap.get(l)?.color || '#999');

        const ringCtx = document.getElementById('chart-ring') as HTMLCanvasElement;
        if(this.ringChartInstance) this.ringChartInstance.destroy();
        this.ringChartInstance = new Chart(ringCtx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: bgColors, borderWidth: 0 }]
            },
            options: { 
                plugins: { 
                    legend: { position: 'bottom', labels: { color: '#e6e1e5' } },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.raw as number;
                                return `${context.label}: ${StatisticsHelpers.formatDecimalMinutesToHHMMSS(val)}`;
                            }
                        }
                    }
                } 
            }
        });

        // Bar Graph
        const lineCtx = document.getElementById('chart-line') as HTMLCanvasElement;
        if(this.lineChartInstance) this.lineChartInstance.destroy();
        
        const daysRaw = [...new Set(rangeSessions.map(s => s.end.split('T')[0]))].sort();
        const focusData = daysRaw.map(d => rangeSessions.filter(s => s.end.startsWith(d) && !s.is_break).reduce((a,b)=>a+b.duration, 0));
        const intData = daysRaw.map(d => rangeSessions.filter(s => s.end.startsWith(d)).reduce((a,b)=>a+b.interruptions, 0));

        this.lineChartInstance = new Chart(lineCtx, {
            type: 'bar',
            data: {
                labels: daysRaw,
                datasets: [
                    { label: 'Focus', data: focusData, backgroundColor: '#d0bcff' },
                    { label: 'Interruptions', data: intData, backgroundColor: '#f2b8b5' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { 
                    x: { ticks: { color: '#e6e1e5' } }, 
                    y: { 
                        ticks: { 
                            color: '#e6e1e5',
                            stepSize: 30,
                            callback: (value: any) => {
                                return `${(value / 60).toFixed(1)} h`;
                            }
                        } 
                    } 
                },
                plugins: { 
                    legend: { labels: { color: '#e6e1e5' } },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.raw as number;
                                return `${context.dataset.label}: ${StatisticsHelpers.formatDecimalMinutesToHHMMSS(val)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    private renderProductiveHours(sessions: Session[], tagMap: Map<string, Tag>) {
        const gridEl = document.getElementById('heatmap-hours')!;
        const labelsEl = document.getElementById('heatmap-labels')!;
        gridEl.innerHTML = '';
        labelsEl.innerHTML = '';
        
        const hours = StatisticsHelpers.getProductiveHoursVector(sessions);
        const maxDur = Math.max(...hours.map(h => h.duration), 1);

        hours.forEach(h => {
            // Cell
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.title = `Hour ${h.hour.toString().padStart(2, '0')}:00: ${StatisticsHelpers.formatDecimalMinutesToHHMMSS(h.duration)}`;
            
            if (h.duration > 0) {
                const color = tagMap.get(h.label)?.color || '#d0bcff';
                const opacity = Math.max(0.2, h.duration / maxDur);
                cell.style.backgroundColor = color;
                cell.style.opacity = opacity.toString();
            }
            gridEl.appendChild(cell);

            // Label
            const label = document.createElement('div');
            // Show every label, but only a few numbers could be shown if it's too cramped.
            // Let's try showing all hour numbers in small text.
            label.textContent = h.hour.toString().padStart(2, '0');
            labelsEl.appendChild(label);
        });
    }

    private renderYearlyHeatmap(sessions: Session[]) {
        const gridEl = document.getElementById('heatmap-yearly')!;
        const monthEl = document.getElementById('heatmap-month-labels')!;
        gridEl.innerHTML = '';
        monthEl.innerHTML = '';
        
        const yearlyData = StatisticsHelpers.getYearlyFocusData(sessions);
        
        const now = new Date();
        const daysToShow = 53 * 7;
        const lastYearStart = new Date(now);
        lastYearStart.setDate(now.getDate() - daysToShow + 1);
        
        // Intensity mapping
        const maxFocus = Math.max(...Object.values(yearlyData), 1, 60);

        let currentMonth = -1;
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(lastYearStart);
            date.setDate(lastYearStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const duration = yearlyData[dateStr] || 0;

            // Month labels (only on the first day of the week column)
            if (i % 7 === 0) {
                const monthLabel = document.createElement('div');
                const m = date.getMonth();
                if (m !== currentMonth) {
                    monthLabel.textContent = months[m];
                    currentMonth = m;
                }
                monthLabel.style.width = '12px';
                monthEl.appendChild(monthLabel);
            }
            
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell yearly-cell';
            cell.title = `${dateStr}: ${StatisticsHelpers.formatDecimalMinutesToHHMMSS(duration)}`;
            
            if (duration > 0) {
                const intensity = Math.min(Math.ceil((duration / maxFocus) * 4), 4);
                cell.setAttribute('data-intensity', intensity.toString());
            } else {
                cell.setAttribute('data-intensity', '0');
            }
            gridEl.appendChild(cell);
        }
    }

    private renderTimeline(sessions: Session[], tagMap: Map<string, Tag>) {
        const list = document.getElementById('timeline-list')!;
        list.innerHTML = '';
        
        // sort by most recent 
        const sorted = [...sessions].sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());

        sorted.forEach(s => {
            const dt = new Date(s.end);
            const dStr = dt.toLocaleDateString();
            const tStr = dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const el = document.createElement('div');
            el.className = 'timeline-item redesigned-item';
            
            const color = tagMap.get(s.label)?.color || '#ccc';

            el.innerHTML = `
                <div class="tl-left">
                    <small>${dStr}</small>
                    <div class="tl-time">${tStr}</div>
                </div>
                <div class="tl-content">
                    <div class="tl-tag" style="background-color: ${color}22; color: ${color}; border-color: ${color}44;">
                        ${s.label}
                    </div>
                    ${s.notes ? `<div class="tl-notes">${s.notes}</div>` : ''}
                </div>
                <div class="tl-right">
                    <div class="tl-duration">${StatisticsHelpers.formatDecimalMinutesToHHMMSS(s.duration)}</div>
                </div>
            `;
            list.appendChild(el);
        });
    }
}
