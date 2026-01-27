import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface WordEntry {
    date: string;
    count: number;
    target?: number;
}

@Component({
    selector: 'app-daily-stats-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="chart-container">
            <canvas #chartCanvas></canvas>
        </div>
    `,
    styles: [`
        :host {
            display: block;
        }

        .chart-container {
            position: relative;
            height: 300px;
            width: 100%;
        }

        @media (max-width: 768px) {
            .chart-container {
                height: 250px;
            }
        }

        @media (max-width: 480px) {
            .chart-container {
                height: 220px;
            }
        }

        @media (max-width: 360px) {
            .chart-container {
                height: 200px;
            }
        }
    `]
})
export class DailyStatsChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() data: WordEntry[] = [];
    @Input() color: string = '#1e293b';
    @Input() useSlicing: boolean = true;
    @Input() mode: 'line' | 'bar' = 'line';
    @Input() unit: string = 'word';
    @Input() pluralUnit: string = 'words';

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
    private chart?: Chart;

    constructor() { }

    ngAfterViewInit(): void {
        this.createChart();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['data'] || changes['mode']) && this.chart) {
            this.updateChart();
        }
    }

    ngOnDestroy(): void {
        if (this.chart) {
            this.chart.destroy();
        }
    }

    private getComputedColor(color: string): string {
        if (color && color.startsWith('var(')) {
            const varName = color.slice(4, -1);
            const element = this.chartCanvas?.nativeElement || document.documentElement;
            const value = getComputedStyle(element).getPropertyValue(varName).trim();
            return value || '#1e293b';
        }
        return color || '#1e293b';
    }

    private processData() {
        // Data should already be sorted and filtered (last 14 days from today) by parent component
        const sortedData = [...this.data].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
        });

        const limit = this.mode === 'bar' ? undefined : -30;
        const displayedData = (this.useSlicing && limit) ? sortedData.slice(limit) : sortedData;

        const labels = displayedData.map(d => {
            if (!d.date) return 'Unknown';

            let date: Date;
            if (typeof d.date === 'string' && d.date.includes('-')) {
                const parts = d.date.split('-');
                date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
                date = new Date(d.date);
            }

            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const actuals = displayedData.map(d => d.count || 0);
        const targets = displayedData.map(d => d.target || 0);

        return { labels, actuals, targets, displayedData };
    }

    private createChart() {
        const { labels, actuals, targets, displayedData } = this.processData();
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const chartData = displayedData || this.data;
        const chartLabels = labels;

        const config: ChartConfiguration = {
            type: this.mode,
            data: {
                labels: chartLabels,
                datasets: this.mode === 'bar' ? [
                    {
                        label: 'Planned Target',
                        data: targets,
                        backgroundColor: '#0098DE20',
                        borderColor: '#0098DE',
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'Actual Progress',
                        data: actuals,
                        backgroundColor: (context: any) => {
                            const index = context.dataIndex;
                            const dayData = chartData[index];
                            if (dayData && dayData.date) {
                                let date: Date;
                                if (typeof dayData.date === 'string' && dayData.date.includes('-')) {
                                    const parts = dayData.date.split('-');
                                    date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                } else {
                                    date = new Date(dayData.date);
                                }

                                const today = new Date();
                                if (date.getDate() === today.getDate() &&
                                    date.getMonth() === today.getMonth() &&
                                    date.getFullYear() === today.getFullYear()) {
                                    return '#0ea5e9';
                                }
                            }
                            return '#10b981';
                        },
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9,
                        minBarLength: 3
                    }
                ] : [
                    {
                        label: 'Planned Target',
                        data: targets,
                        borderColor: '#0098DE',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Actual Progress',
                        data: actuals,
                        borderColor: this.getComputedColor(this.color),
                        backgroundColor: this.getGradient(ctx, this.getComputedColor(this.color)),
                        borderWidth: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: this.getComputedColor(this.color),
                        pointBorderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointHoverBackgroundColor: this.getComputedColor(this.color),
                        pointHoverBorderColor: '#fff',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#fff',
                        titleColor: '#1e293b',
                        bodyColor: '#64748b',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: this.mode === 'line',
                        callbacks: {
                            title: (context) => {
                                return context[0].label;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                const datasetLabel = context.dataset.label || '';
                                const index = context.dataIndex;

                                if (chartData && index < chartData.length) {
                                    const dayData = chartData[index];
                                    const target = dayData.target || 0;

                                    const unitLabel = Math.abs(value) === 1 ? this.unit : this.pluralUnit;
                                    const targetUnitLabel = Math.abs(target) === 1 ? this.unit : this.pluralUnit;
                                    const diff = value - target;
                                    const diffUnitLabel = Math.abs(diff) === 1 ? this.unit : this.pluralUnit;

                                    if (datasetLabel === 'Actual Progress') {
                                        return [
                                            `${datasetLabel}: ${new Intl.NumberFormat('en-US').format(value)} ${unitLabel}`,
                                            `Target: ${new Intl.NumberFormat('en-US').format(target)} ${targetUnitLabel}`,
                                            `Difference: ${new Intl.NumberFormat('en-US').format(diff)} ${diffUnitLabel}`
                                        ];
                                    } else if (datasetLabel === 'Planned Target') {
                                        return `${datasetLabel}: ${new Intl.NumberFormat('en-US').format(value)} ${unitLabel}`;
                                    }
                                }

                                const finalUnitLabel = Math.abs(value) === 1 ? this.unit : this.pluralUnit;
                                return `${datasetLabel}: ${new Intl.NumberFormat('en-US').format(value)} ${finalUnitLabel}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 10,
                                weight: 600
                            },
                            maxRotation: 45,
                            autoSkip: false,
                            maxTicksLimit: this.mode === 'bar' ? 14 : 15,
                            callback: (value: any, index: number, ticks: any[]) => {
                                if (this.mode === 'bar') {
                                    const numValue = typeof value === 'number' ? value : Number(value);
                                    if (numValue >= 0 && numValue < chartLabels.length) {
                                        return chartLabels[numValue];
                                    }
                                    return '';
                                } else {
                                    const step = Math.max(1, Math.floor(ticks.length / 12));
                                    if (index % step === 0 || index === ticks.length - 1) {
                                        const numValue = typeof value === 'number' ? value : Number(value);
                                        if (numValue >= 0 && numValue < chartLabels.length) {
                                            return chartLabels[numValue];
                                        }
                                    }
                                    return '';
                                }
                            }
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#94a3b8',
                            padding: 10,
                            font: {
                                size: 10
                            },
                            callback: (value) => {
                                const val = value as number;
                                if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
                                return val;
                            },
                            maxTicksLimit: 5
                        },
                        border: {
                            display: false
                        }
                    }
                }
            },
            plugins: this.mode === 'bar' ? [{
                id: 'barLabels',
                afterDatasetsDraw: (chart: any) => {
                    const { ctx, data } = chart;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.font = 'bold 9px "Outfit", sans-serif';

                    const dataset = data.datasets[1]; // Actual Progress
                    if (dataset && dataset.label === 'Actual Progress') {
                        const meta = chart.getDatasetMeta(1);
                        meta.data.forEach((bar: any, index: number) => {
                            const value = dataset.data[index] as number;
                            if (value > 0) {
                                const displayValue = value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toString();
                                ctx.fillStyle = index === meta.data.length - 1 ? '#0ea5e9' : '#10b981';
                                ctx.fillText(displayValue, bar.x, bar.y - 5);
                            }
                        });
                    }
                    ctx.restore();
                }
            }] : []
        };

        this.chart = new Chart(ctx, config);
    }

    private getGradient(ctx: CanvasRenderingContext2D, color: string) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, `${color}26`);
        gradient.addColorStop(1, `${color}03`);
        return gradient;
    }

    private updateChart() {
        if (this.chart) {
            this.chart.destroy();
            this.createChart();
        }
    }
}
