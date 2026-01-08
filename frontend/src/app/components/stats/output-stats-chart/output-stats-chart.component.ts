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
    @Input() color: string = '#1C2E4A'; // Default premium navy
    @Input() showActualProgress: boolean = true; // Control whether to show actual progress line

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
    private chart?: Chart;

    constructor() { }

    ngAfterViewInit(): void {
        this.createChart();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['data'] || changes['color'] || changes['showActualProgress']) && this.chart) {
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
            return value || '#1C2E4A';
        }
        return color || '#1C2E4A';
    }

    private processData() {
        if (!this.data || this.data.length === 0) {
            return { labels: [], progressData: [], targetData: [] };
        }

        // Sort by date just in case
        const sortedData = [...this.data].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
        });

        const labels = sortedData.map(d => {
            if (!d.date) return 'Unknown';

            // Try ISO split first
            if (d.date.includes('-')) {
                const parts = d.date.split('-');
                if (parts.length >= 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
                    const day = parseInt(parts[2], 10);
                    const date = new Date(year, month, day);
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }
                }
            }

            // Fallback to standard constructor
            const date = new Date(d.date);
            return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        });

        let cumulativeSum = this.initialCount;
        let cumulativeTarget = this.initialCount;
        const progressData = sortedData.map(d => {
            cumulativeSum += (d.count || 0);
            return cumulativeSum;
        });

        const targetData = sortedData.map(d => {
            cumulativeTarget += (d.target || 0);
            return cumulativeTarget;
        });

        // Add "Start" point (Day before first log represented as 0)
        if (sortedData.length > 0 && sortedData[0].date) {
            let firstDate: Date;
            if (sortedData[0].date.includes('-')) {
                const parts = sortedData[0].date.split('-');
                firstDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
                firstDate = new Date(sortedData[0].date);
            }

            if (!isNaN(firstDate.getTime())) {
                firstDate.setDate(firstDate.getDate() - 1);
                labels.unshift('Start');
                progressData.unshift(this.initialCount);
                targetData.unshift(this.initialCount);
            }
        }

        return { labels, progressData, targetData };
    }

    private createChart() {
        const { labels, progressData, targetData } = this.processData();
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const baseColor = this.getComputedColor(this.color || '#1C2E4A');
        const chartData = this.data; // Store reference for callbacks

        const datasets: any[] = [
            {
                label: 'Planned Target',
                data: targetData,
                borderColor: '#94a3b8',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0, // Hide points for target line
                pointHoverRadius: 0,
                fill: false,
                tension: 0, // Straight lines for target usually
            }
        ];

        // Add actual progress dataset only if showActualProgress is true
        if (this.showActualProgress) {
            // Create gradient for fill
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, `${baseColor}26`); // Approx 15% opacity
            gradient.addColorStop(1, `${baseColor}03`); // Approx 1% opacity

            datasets.push({
                label: 'Your Progress',
                data: progressData,
                borderColor: baseColor,
                backgroundColor: gradient,
                borderWidth: 4,
                pointBackgroundColor: '#fff',
                pointBorderColor: baseColor,
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: baseColor,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                tension: 0.3, // Smooth line
                fill: true,
            });
        }

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
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
                                const value = context.parsed.y;
                                const label = context.dataset.label;
                                
                                // Only show cumulative total, no daily details
                                return `${label}: ${new Intl.NumberFormat('en-US').format(value)} words`;
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
                            color: '#1e293b',
                            font: {
                                size: 10,
                                weight: 600
                            },
                            maxTicksLimit: 15, // Show more dates on x-axis
                            maxRotation: 45, // Allow rotation for better readability
                            autoSkip: true,
                            callback: function(value, index, ticks) {
                                // Show every nth label to avoid crowding
                                const step = Math.max(1, Math.floor(ticks.length / 12));
                                if (index % step === 0 || index === ticks.length - 1) {
                                    const numValue = typeof value === 'number' ? value : Number(value);
                                    return this.getLabelForValue(numValue);
                                }
                                return '';
                            }
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: '#f1f5f9',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 10
                            },
                            callback: (value) => {
                                const val = value as number;
                                if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
                                return val;
                            },
                            maxTicksLimit: 6
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
                    duration: 1200,
                    easing: 'easeOutQuart'
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    private updateChart() {
        const { labels, progressData, targetData } = this.processData();
        if (this.chart) {
            const baseColor = this.getComputedColor(this.color || '#1C2E4A');
            
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = targetData;
            
            // Update or add/remove actual progress dataset based on showActualProgress
            if (this.showActualProgress) {
                if (this.chart.data.datasets.length === 1) {
                    // Add progress dataset if it doesn't exist
                    const ctx = this.chartCanvas.nativeElement.getContext('2d');
                    if (ctx) {
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, `${baseColor}26`);
                        gradient.addColorStop(1, `${baseColor}03`);
                        
                        this.chart.data.datasets.push({
                            label: 'Your Progress',
                            data: progressData,
                            borderColor: baseColor,
                            backgroundColor: gradient,
                            borderWidth: 4,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: baseColor,
                            pointBorderWidth: 2,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: baseColor,
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                            tension: 0.3,
                            fill: true,
                        } as any);
                    }
                } else {
                    // Update existing progress dataset
                    const progressDataset = this.chart.data.datasets[1] as any;
                    progressDataset.data = progressData;
                    progressDataset.borderColor = baseColor;
                    progressDataset.pointBorderColor = baseColor;
                    progressDataset.pointHoverBackgroundColor = baseColor;
                    
                    const ctx = this.chartCanvas.nativeElement.getContext('2d');
                    if (ctx) {
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, `${baseColor}26`);
                        gradient.addColorStop(1, `${baseColor}03`);
                        progressDataset.backgroundColor = gradient;
                    }
                }
            } else {
                // Remove progress dataset if it exists
                if (this.chart.data.datasets.length > 1) {
                    this.chart.data.datasets = [this.chart.data.datasets[0]];
                }
            }

            this.chart.update();
        }
    }

}
