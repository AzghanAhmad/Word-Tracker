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
    @Input() unit: string = 'word';
    @Input() pluralUnit: string = 'words';
    @Input() smoothPath: boolean = false; // Smooth the target line for 'Path' look
    /** When true, do not add a "Start" (day-before) point; first point = first date in data */
    @Input() skipStartPoint: boolean = false;
    /** Number of x-axis ticks to show (e.g. 15–30), evenly distributed */
    @Input() xAxisTickCount: number = 22;
    /** Key dates from plans (start/end dates) to prioritize showing on x-axis */
    @Input() planDates: string[] = [];

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
    private chart?: Chart;

    constructor() { }

    ngAfterViewInit(): void {
        this.createChart();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['data'] || changes['color'] || changes['showActualProgress'] ||
            changes['skipStartPoint'] || changes['xAxisTickCount'] || changes['planDates']) && this.chart) {
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


        // Optionally add "Start" point (day before first date); skip when skipStartPoint (e.g. Overall Growth)
        if (!this.skipStartPoint && sortedData.length > 0 && sortedData[0].date) {
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

        const datasets: any[] = [];

        // Only add target dataset if it has non-zero values (to avoid invisible flat line at 0)
        const hasNonZeroTarget = targetData.some(v => v > 0);
        if (hasNonZeroTarget) {
            datasets.push({
                label: 'Planned Target',
                data: targetData,
                borderColor: baseColor,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0, // Hide points for target line
                pointHoverRadius: 0,
                fill: false,
                tension: this.smoothPath ? 0.3 : 0, // Conditionally smooth path
            });
        }

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
                        position: 'nearest',
                        backgroundColor: '#fff',
                        titleColor: '#1e293b',
                        bodyColor: '#64748b',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        caretSize: 0,
                        caretPadding: 4,
                        callbacks: {
                            title: (context) => {
                                return context[0].label;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                const label = context.dataset.label;

                                const unitLabel = Math.abs(value) === 1 ? this.unit : this.pluralUnit;

                                // Only show cumulative total, no daily details
                                return `${label}: ${new Intl.NumberFormat('en-US').format(value)} ${unitLabel}`;
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
                            maxTicksLimit: 30,
                            maxRotation: 45,
                            autoSkip: false,
                            callback: (value, index, ticks) => {
                                const labels = this.chart?.data?.labels as string[] | undefined;
                                if (!labels || !labels.length) return '';

                                const totalTicks = labels.length;
                                const label = labels[index] as string;
                                const K = Math.min(30, Math.max(15, Math.min(this.xAxisTickCount, totalTicks)));
                                const indicesToShow = new Set<number>();

                                // First, include indices that correspond to plan dates (start/end dates)
                                if (this.planDates && this.planDates.length > 0) {
                                    this.planDates.forEach(planDate => {
                                        const planIndex = labels.findIndex(l => l === planDate);
                                        if (planIndex >= 0) {
                                            indicesToShow.add(planIndex);
                                        }
                                    });
                                }

                                // Then fill remaining slots with evenly spaced dates
                                if (totalTicks <= K || K <= 1) {
                                    for (let i = 0; i < totalTicks; i++) indicesToShow.add(i);
                                } else {
                                    // Always include first and last if not already included
                                    indicesToShow.add(0);
                                    indicesToShow.add(totalTicks - 1);

                                    // Add evenly spaced indices for remaining slots
                                    const remainingSlots = K - indicesToShow.size;
                                    if (remainingSlots > 0) {
                                        for (let i = 0; i < remainingSlots; i++) {
                                            const idx = Math.round(((i + 1) / (remainingSlots + 1)) * (totalTicks - 1));
                                            indicesToShow.add(idx);
                                        }
                                    }
                                }

                                if (!indicesToShow.has(index)) return null;

                                // Handle special labels like "Start"
                                if (label === 'Start' || !label.includes('-')) {
                                    return label;
                                }

                                // Parse and format the date from YYYY-MM-DD format
                                const parts = label.split('-');
                                if (parts.length >= 3) {
                                    const year = parseInt(parts[0], 10);
                                    const month = parseInt(parts[1], 10) - 1;
                                    const day = parseInt(parts[2], 10);
                                    const date = new Date(year, month, day);
                                    if (!isNaN(date.getTime())) {
                                        // For long ranges, show month and year; for short ranges, include day
                                        const totalDays = totalTicks;
                                        if (totalDays > 90) { // More than 3 months
                                            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                                        } else {
                                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        }
                                    }
                                }

                                // Fallback
                                return label;
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
                    mode: 'index',
                    axis: 'x'
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
            const hasNonZeroTarget = targetData.some(v => v > 0);

            this.chart.data.labels = labels;

            // Handle target dataset (may or may not exist)
            const targetDatasetIndex = this.chart.data.datasets.findIndex(ds => ds.label === 'Planned Target');
            if (hasNonZeroTarget) {
                if (targetDatasetIndex === -1) {
                    // Add target dataset
                    this.chart.data.datasets.unshift({
                        label: 'Planned Target',
                        data: targetData,
                        borderColor: baseColor,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: this.smoothPath ? 0.3 : 0,
                    });
                } else {
                    // Update existing target dataset
                    this.chart.data.datasets[targetDatasetIndex].data = targetData;
                    this.chart.data.datasets[targetDatasetIndex].borderColor = baseColor;
                }
            } else {
                // Remove target dataset if it exists
                if (targetDatasetIndex !== -1) {
                    this.chart.data.datasets.splice(targetDatasetIndex, 1);
                }
            }

            // Handle progress dataset
            const progressDatasetIndex = this.chart.data.datasets.findIndex(ds => ds.label === 'Your Progress');
            if (this.showActualProgress) {
                const ctx = this.chartCanvas.nativeElement.getContext('2d');
                if (ctx) {
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, `${baseColor}26`);
                    gradient.addColorStop(1, `${baseColor}03`);

                    if (progressDatasetIndex === -1) {
                        // Add progress dataset
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
                    } else {
                        // Update existing progress dataset
                        const progressDataset = this.chart.data.datasets[progressDatasetIndex] as any;
                        progressDataset.data = progressData;
                        progressDataset.borderColor = baseColor;
                        progressDataset.pointBorderColor = baseColor;
                        progressDataset.pointHoverBackgroundColor = baseColor;
                        progressDataset.backgroundColor = gradient;
                    }
                }
            } else {
                // Remove progress dataset if it exists
                if (progressDatasetIndex !== -1) {
                    this.chart.data.datasets.splice(progressDatasetIndex, 1);
                }
            }

            this.chart.update();
        }
    }

}
