import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface WordEntry {
    date: string;
    count: number;
}

@Component({
    selector: 'app-output-stats-chart',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './output-stats-chart.component.html',
    styleUrls: ['./output-stats-chart.component.scss']
})
export class OutputStatsChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() data: WordEntry[] = [];
    @Input() totalTarget: number = 50000; // Default target to reach
    @Input() initialCount: number = 0;

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
        // Sort by date just in case
        const sortedData = [...this.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const labels = sortedData.map(d => {
            // Fix timezone issue: Parse YYYY-MM-DD as LOCAL date
            // d.date is "2026-01-04"
            const parts = d.date.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
            const day = parseInt(parts[2], 10);

            const date = new Date(year, month, day);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        });
        let cumulativeSum = this.initialCount;
        const progressData = sortedData.map(d => {
            cumulativeSum += d.count;
            return cumulativeSum;
        });

        // Add "Start" point (Day before first log represented as 0)
        // This anchors the chart to 0 words at the beginning
        if (sortedData.length > 0) {
            const firstParts = sortedData[0].date.split('-');
            const firstDate = new Date(parseInt(firstParts[0], 10), parseInt(firstParts[1], 10) - 1, parseInt(firstParts[2], 10));

            // Subtract 1 day
            firstDate.setDate(firstDate.getDate() - 1);
            const startLabel = 'Start';

            labels.unshift(startLabel);
            progressData.unshift(this.initialCount);
        }

        // "Word Only": No target prediction
        return { labels, progressData };
    }

    private createChart() {
        const { labels, progressData } = this.processData();
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Your Progress',
                        data: progressData,
                        borderColor: '#1C2E4A', // Premium Blue
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        pointBackgroundColor: '#1C2E4A',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        pointHoverBackgroundColor: '#1C2E4A',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 3,
                        tension: 0.4, // Smooth line
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Required
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#fff',
                        titleColor: '#1e293b',
                        bodyColor: '#64748b',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            title: (context) => {
                                return context[0].label;
                            },
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;

                                if (label === 'Your Progress') {
                                    // Explicitly show 0
                                    if (value === 0) return 'Your Progress: 0';
                                    if (!value) return 'Your Progress: -';
                                    return `Your Progress: ${new Intl.NumberFormat('en-US').format(value)}`;
                                } else {
                                    return `Target Progress: ${new Intl.NumberFormat('en-US').format(value)}`;
                                }
                            },
                            labelColor: (context) => {
                                if (context.dataset.label === 'Your Progress') {
                                    return {
                                        borderColor: '#1C2E4A', // Premium Blue
                                        backgroundColor: '#1C2E4A'
                                    };
                                }
                                return {
                                    borderColor: '#3b82f6', // Target Blue
                                    backgroundColor: '#3b82f6'
                                };
                            },
                            labelTextColor: (context) => {
                                if (context.dataset.label === 'Your Progress') return '#1C2E4A';
                                return '#3b82f6';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false // No vertical lines
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 11
                            },
                            maxTicksLimit: 7,
                            maxRotation: 0,
                            autoSkip: true
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: '#f1f5f9',
                            circular: false,
                            // horizontal lines only is default behavior when x grid is disabled
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
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    private updateChart() {
        const { labels, progressData } = this.processData();
        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = progressData;
            this.chart.update();
        }
    }
}
