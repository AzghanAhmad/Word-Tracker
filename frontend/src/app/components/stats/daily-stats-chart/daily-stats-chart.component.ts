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
        .chart-container {
            position: relative;
            height: 300px;
            width: 100%;
        }
    `]
})
export class DailyStatsChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() data: WordEntry[] = [];
    @Input() color: string = '#1C2E4A'; // Default blue
    @Input() useSlicing: boolean = true;

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
        // Sort by date
        const sortedData = [...this.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Take last 14 days or all if less, unless slicing is disabled
        const displayedData = this.useSlicing ? sortedData.slice(-14) : sortedData;

        const labels = displayedData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        });
        const actuals = displayedData.map(d => d.count);
        const targets = displayedData.map(d => d.target || 0);

        return { labels, actuals, targets };
    }

    private createChart() {
        const { labels, actuals } = this.processData();
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const config: ChartConfiguration = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Actual Words',
                        data: actuals,
                        backgroundColor: this.color,
                        borderRadius: 4,
                        barThickness: 16
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
                        displayColors: false,
                        callbacks: {
                            label: (context) => {
                                return `Words: ${new Intl.NumberFormat('en-US').format(context.parsed.y)}`;
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
                                size: 11
                            },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 7
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 11
                            },
                            callback: (value) => new Intl.NumberFormat('en-US').format(value as number)
                        },
                        border: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    private updateChart() {
        const { labels, actuals } = this.processData();
        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = actuals;
            this.chart.update();
        }
    }
}
