import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface WordEntry {
    date: string;
    count: number;
}

@Component({
    selector: 'app-avg-speed-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="chart-container">
            <canvas #chartCanvas></canvas>
        </div>
    `,
    styles: [`
        .chart-container {
            position: relative;
            height: 300px;
            width: 100%;
        }
    `]
})
export class AvgSpeedChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() data: WordEntry[] = [];
    @Input() color: string = '#8b5cf6'; // Purple default

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
    private chart?: Chart;

    constructor() { }

    ngAfterViewInit(): void {
        this.createChart();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.chart) {
            this.updateChart();
        }
    }

    ngOnDestroy(): void {
        if (this.chart) {
            this.chart.destroy();
        }
    }

    private processData() {
        // Sort by date sort
        const sortedData = [...this.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        // Last 30 days maximum
        const displayedData = sortedData.slice(-30);

        const labels = displayedData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const values = displayedData.map(d => d.count);

        // Calculate moving average (7 days)
        const movingAvg = displayedData.map((_, index, array) => {
            const start = Math.max(0, index - 6);
            const subset = array.slice(start, index + 1);
            const sum = subset.reduce((a, b) => a + b.count, 0);
            return Math.round(sum / subset.length);
        });

        return { labels, values, movingAvg };
    }

    private createChart() {
        const { labels, values, movingAvg } = this.processData();
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        // Gradient for Area
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.4)'); // Purple high
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)'); // Purple low

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Average Speed (7-day)',
                        data: movingAvg,
                        borderColor: this.data.length > 0 ? this.color : '#cbd5e1',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        borderDash: [5, 5],
                        fill: false
                    },
                    {
                        label: 'Daily Words',
                        data: values,
                        borderColor: this.data.length > 0 ? this.color : '#cbd5e1',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: this.color,
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#fff',
                        titleColor: '#1e293b',
                        bodyColor: '#64748b',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', maxTicksLimit: 10 }
                    },
                    y: {
                        grid: { color: '#f1f5f9' },
                        ticks: { color: '#94a3b8' },
                        beginAtZero: true
                    }
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    private updateChart() {
        const { labels, values, movingAvg } = this.processData();
        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = movingAvg;
            this.chart.data.datasets[1].data = values;
            this.chart.update();
        }
    }
}
