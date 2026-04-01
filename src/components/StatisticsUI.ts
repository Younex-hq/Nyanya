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
                <button class="btn-secondary" id="btn-export-json" style="align-self: flex-end;">Download JSON</button>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Today's Overview</h3>
                        <p>Focus: <span id="stat-today-focus">0</span> min</p>
                        <p>Break: <span id="stat-today-break">0</span> min</p>
                        <p>Interruptions: <span id="stat-today-int">0</span> min</p>
                    </div>
                    
                    <div class="stat-card">
                        <h3>Total Overview</h3>
                        <label>Range:</label>
                        <select id="stat-range-select" class="input-field">
                            <option value="today">Today</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                            <option value="total" selected>Total</option>
                        </select>
                        <p>Focus: <span id="stat-range-focus">0</span> min</p>
                    </div>
                </div>

                <div class="stat-card">
                    <h3>Focus Distribution</h3>
                    <div style="max-width: 400px; margin: 0 auto;">
                        <canvas id="chart-ring"></canvas>
                    </div>
                </div>

                <div class="stat-card">
                    <h3>Focus / Interruptions Ratio</h3>
                    <div style="width: 100%; height: 300px;">
                        <canvas id="chart-line"></canvas>
                    </div>
                </div>

                <div class="stat-card heatmap-container">
                    <h3>Productive Hours (Today)</h3>
                    <div class="heatmap-grid" id="heatmap-hours" style="grid-template-rows: repeat(1, 1fr); height: 30px;">
                        <!-- 24 cells for hours -->
                    </div>
                </div>

                <div class="stat-card">
                    <h3>Timeline</h3>
                    <div id="timeline-list" class="timeline-list">
                        <!-- timeline items -->
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-export-json')!.addEventListener('click', () => {
            StorageService.exportData();
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
        
        document.getElementById('stat-today-focus')!.textContent = StatisticsHelpers.getFocusTimeMin(todaySessions).toFixed(1);
        document.getElementById('stat-today-break')!.textContent = StatisticsHelpers.getBreakTimeMin(todaySessions).toFixed(1);
        document.getElementById('stat-today-int')!.textContent = StatisticsHelpers.getInterruptionsMin(todaySessions).toFixed(1);

        const rangeStr = (document.getElementById('stat-range-select') as HTMLSelectElement).value as any;
        const rangeSessions = StatisticsHelpers.filterByRange(sessions, rangeStr);
        document.getElementById('stat-range-focus')!.textContent = StatisticsHelpers.getFocusTimeMin(rangeSessions).toFixed(1);

        this.renderGraphs(rangeSessions, tagMap);
        this.renderProductiveHours(sessions, tagMap);
        this.renderTimeline(rangeSessions, tagMap);
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
            options: { plugins: { legend: { position: 'bottom', labels: { color: '#e6e1e5' } } } }
        });

        // Line Graph
        const lineCtx = document.getElementById('chart-line') as HTMLCanvasElement;
        if(this.lineChartInstance) this.lineChartInstance.destroy();
        
        // aggregate by day for line graph
        const daysRaw = [...new Set(sessions.map(s => s.end.split('T')[0]))].sort();
        const focusData = daysRaw.map(d => sessions.filter(s => s.end.startsWith(d) && !s.is_break).reduce((a,b)=>a+b.duration, 0));
        const intData = daysRaw.map(d => sessions.filter(s => s.end.startsWith(d)).reduce((a,b)=>a+b.interruptions, 0));

        this.lineChartInstance = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: daysRaw,
                datasets: [
                    { label: 'Focus', data: focusData, borderColor: '#d0bcff', backgroundColor: 'rgba(208,188,255,0.1)', fill: true, tension: 0.4 },
                    { label: 'Interruptions', data: intData, borderColor: '#f2b8b5', backgroundColor: 'rgba(242,184,181,0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { 
                    x: { ticks: { color: '#e6e1e5' } }, 
                    y: { ticks: { color: '#e6e1e5' } } 
                },
                plugins: { legend: { labels: { color: '#e6e1e5' } } }
            }
        });
    }

    private renderProductiveHours(sessions: Session[], tagMap: Map<string, Tag>) {
        const mapEl = document.getElementById('heatmap-hours')!;
        mapEl.innerHTML = '';
        const hours = StatisticsHelpers.getProductiveHoursVector(sessions);
        
        const maxDur = Math.max(...hours.map(h => h.duration), 1);

        hours.forEach(h => {
            const el = document.createElement('div');
            el.className = 'heatmap-cell';
            el.title = `Hour ${h.hour}: ${h.duration.toFixed(1)} mins`;
            
            if (h.duration > 0) {
                const color = tagMap.get(h.label)?.color || '#d0bcff';
                // Adjust opacity based on intensity
                const opacity = Math.max(0.2, h.duration / maxDur);
                el.style.backgroundColor = color;
                el.style.opacity = opacity.toString();
            }
            mapEl.appendChild(el);
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
                    <div>${s.duration.toFixed(1)} min</div>
                    <small>${dStr} ${tStr}</small>
                </div>
            `;
            list.appendChild(el);
        });
    }
}
