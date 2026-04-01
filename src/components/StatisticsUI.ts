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
                <div style="display: flex; justify-content: flex-end; align-items: center;">
                    <select id="stat-range-select" class="input-field" style="width: auto; padding: 0.5rem; margin: 0;">
                        <option value="today">Today</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                        <option value="total" selected>Total</option>
                    </select>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card minimal-card">
                        <h3>Today</h3>
                        <div class="stat-row"><span>Focus</span> <strong id="stat-today-focus">00:00</strong></div>
                        <div class="stat-row"><span>Break</span> <strong id="stat-today-break">00:00</strong></div>
                        <div class="stat-row"><span>Ints</span> <strong id="stat-today-int">00:00</strong></div>
                    </div>
                    
                    <div class="stat-card minimal-card">
                        <h3>Selected Range</h3>
                        <div class="stat-row"><span>Focus</span> <strong id="stat-range-focus">00:00</strong></div>
                        <div class="stat-row" style="visibility: hidden;"><span>Placeholder</span> <strong>00:00</strong></div>
                        <div class="stat-row" style="visibility: hidden;"><span>Placeholder</span> <strong>00:00</strong></div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Distribution</h3>
                        <div style="max-width: 200px; margin: 0 auto;">
                            <canvas id="chart-ring"></canvas>
                        </div>
                    </div>

                    <div class="stat-card">
                        <h3>Focus vs Interruptions</h3>
                        <div style="width: 100%; height: 200px;">
                            <canvas id="chart-line"></canvas>
                        </div>
                    </div>
                </div>

                <div class="stat-card heatmap-container">
                    <h3>Productive Hours (Today)</h3>
                    <div id="heatmap-container-inner" style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <div class="heatmap-grid" id="heatmap-hours" style="grid-template-rows: repeat(1, 1fr); height: 30px;">
                            <!-- 24 cells for hours -->
                        </div>
                        <div class="heatmap-labels" id="heatmap-labels" style="display: grid; grid-auto-columns: 14px; grid-auto-flow: column; gap: 4px; font-size: 0.6rem; text-align: center; opacity: 0.6;">
                            <!-- labels -->
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">Timeline</h3>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn-secondary" id="btn-export-json" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Export JSON</button>
                            <button class="btn-secondary" id="btn-import-json" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Import JSON</button>
                            <input type="file" id="input-import-json" accept=".json" class="hidden" />
                        </div>
                    </div>
                    <div id="timeline-list" class="timeline-list">
                        <!-- timeline items -->
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-export-json')!.addEventListener('click', () => {
            StorageService.exportData();
        });

        const btnImport = document.getElementById('btn-import-json')!;
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

        this.renderGraphs(rangeSessions, tagMap);
        this.renderProductiveHours(sessions, tagMap);
        this.renderTimeline(rangeSessions.filter(s => !s.is_break), tagMap);
    }

    private renderGraphs(sessions: Session[], tagMap: Map<string, Tag>) {
        const focusSessions = sessions.filter(s => !s.is_break);
        
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

        // Line Graph
        const lineCtx = document.getElementById('chart-line') as HTMLCanvasElement;
        if(this.lineChartInstance) this.lineChartInstance.destroy();
        
        // aggregate by day for line graph
        const daysRaw = [...new Set(sessions.map(s => s.end.split('T')[0]))].sort();
        const focusData = daysRaw.map(d => sessions.filter(s => s.end.startsWith(d) && !s.is_break).reduce((a,b)=>a+b.duration, 0));
        const intData = daysRaw.map(d => sessions.filter(s => s.end.startsWith(d)).reduce((a,b)=>a+b.interruptions, 0));

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
                    y: { ticks: { color: '#e6e1e5' } } 
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
            el.className = 'timeline-item';
            
            const color = tagMap.get(s.label)?.color || '#ccc';

            el.innerHTML = `
                <div>
                    <strong>${s.is_break ? 'Break' : 'Focus'}</strong> 
                    <span style="color: ${color}">[${s.label}]</span>
                    ${s.notes ? `<div><small>${s.notes}</small></div>` : ''}
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 500;">${StatisticsHelpers.formatDecimalMinutesToHHMMSS(s.duration)}</div>
                    <small style="opacity: 0.6;">${dStr} ${tStr}</small>
                </div>
            `;
            list.appendChild(el);
        });
    }
}
