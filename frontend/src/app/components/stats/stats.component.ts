import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { OutputStatsChartComponent } from './output-stats-chart/output-stats-chart.component';
import { DailyStatsChartComponent } from './daily-stats-chart/daily-stats-chart.component';
import { filter } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

interface DayStat {
    date: string;
    count: number;
    target?: number;
}

interface ActivityDay {
    date: Date;
    count: number;
    level: 0 | 1 | 2 | 3 | 4; // 0=none, 4=high
}

@Component({
    selector: 'app-stats',
    standalone: true,
    imports: [CommonModule, ContentLoaderComponent, OutputStatsChartComponent, DailyStatsChartComponent],
    templateUrl: './stats.component.html',
    styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements OnInit {
    isLoading = true;

    // Real Data
    totalWords = 0;
    weeklyAvg = 0;
    bestDay = 0;
    currentStreak = 0;

    // Chart Data
    activityData: DayStat[] = []; // Last 14 days (deprecated, kept for compatibility)
    monthlyData: DayStat[] = []; // Current month daily data
    allDaysDataForChart: DayStat[] = [];
    initialChartCount: number = 0;
    heatmapGrid: ActivityDay[][] = []; // Weeks x Days

    // Line Chart (Cumulative)
    lineChartPoints: string = '';
    lineChartArea: string = '';
    lineChartDataPoints: { x: number, y: number, words: number, day: number }[] = [];

    // Bar Chart
    barChartMax = 0;

    // Tooltip state
    activeTooltip: number | null = null;
    tooltipX = 0;
    tooltipY = 0;

    // Heatmap tooltip state
    heatmapTooltip = {
        visible: false,
        x: 0,
        y: 0,
        date: '',
        count: 0
    };

    constructor(
        private apiService: ApiService,
        private cdr: ChangeDetectorRef,
        private router: Router
    ) { }

    showTooltip(index: number) {
        this.activeTooltip = index;
    }

    hideTooltip() {
        this.activeTooltip = null;
    }

    ngOnInit() {
        this.loadStats();
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            if (event.url === '/stats' || event.url.includes('/stats')) {
                this.loadStats();
            }
        });
    }

    loadStats() {
        this.isLoading = true;
        this.cdr.detectChanges();

        forkJoin({
            stats: this.apiService.getStats(),
            plans: this.apiService.getPlans()
        }).subscribe({
            next: (response: any) => {
                const statsResponse = response.stats;
                const plansResponse = response.plans;

                if (statsResponse.success && statsResponse.data) {
                    const data = statsResponse.data;

                    // Set metrics
                    this.totalWords = data.totalWords || 0;
                    this.weeklyAvg = data.weeklyAvg || 0;
                    this.bestDay = data.bestDay || 0;
                    this.currentStreak = data.currentStreak || 0;
                    console.log('🔥 Stats page - Streak loaded from backend:', this.currentStreak);

                    // Determine earliest plan date
                    let earliestPlanDateVal: Date | null = null;
                    if (plansResponse.success && plansResponse.data && Array.isArray(plansResponse.data)) {
                        plansResponse.data.forEach((p: any) => {
                            if (p.start_date) {
                                const pd = new Date(p.start_date);
                                if (!isNaN(pd.getTime())) {
                                    if (!earliestPlanDateVal || pd < earliestPlanDateVal) {
                                        earliestPlanDateVal = pd;
                                    }
                                }
                            }
                        });
                    }

                    // Process activity data
                    let allDaysData: DayStat[] = (data.allDaysData || []).map((d: any) => {
                        let dateStr: string;
                        if (typeof d.date === 'string') {
                            if (d.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                dateStr = d.date;
                            } else if (d.date.includes('T')) {
                                dateStr = d.date.split('T')[0];
                            } else {
                                const dateObj = new Date(d.date);
                                if (!isNaN(dateObj.getTime())) {
                                    const y = dateObj.getFullYear();
                                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                                    const day = String(dateObj.getDate()).padStart(2, '0');
                                    dateStr = `${y}-${m}-${day}`;
                                } else {
                                    dateStr = d.date;
                                }
                            }
                        } else {
                            const dateObj = new Date(d.date);
                            const y = dateObj.getFullYear();
                            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const day = String(dateObj.getDate()).padStart(2, '0');
                            dateStr = `${y}-${m}-${day}`;
                        }
                        return {
                            date: dateStr,
                            count: d.count || 0,
                            target: d.target || 0
                        };
                    });

                    // Sort strict by date
                    allDaysData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    // Chart GENERATION: Start from earliestPlanDate if it exists and is earlier than first log
                    if (allDaysData.length > 0 || earliestPlanDateVal) {
                        const filledData: DayStat[] = [];

                        let startDate: Date;
                        const firstLogDate = allDaysData.length > 0 ? new Date(allDaysData[0].date) : new Date();

                        // Use earliest plan date if available. 
                        // If plan date is OLDER (earlier) than first log, we start there (extending back).
                        // If plan date is NEWER (later) than first log, we still start at first log (to not hide data).
                        if (earliestPlanDateVal && earliestPlanDateVal < firstLogDate) {
                            startDate = new Date(earliestPlanDateVal);
                        } else {
                            // Default to first log date, or if no logs, use plan date, or fallback
                            if (allDaysData.length > 0) {
                                startDate = new Date(firstLogDate);
                            } else if (earliestPlanDateVal) {
                                startDate = new Date(earliestPlanDateVal);
                            } else {
                                startDate = new Date();
                                startDate.setDate(startDate.getDate() - 30);
                            }
                        }

                        const endDate = new Date(); // Today
                        startDate.setHours(0, 0, 0, 0);
                        endDate.setHours(0, 0, 0, 0);

                        const toLocalISOString = (date: Date) => {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            return `${y}-${m}-${d}`;
                        };

                        const dataMap = new Map<string, { count: number, target: number }>();
                        allDaysData.forEach(d => {
                            dataMap.set(d.date, { count: d.count, target: d.target || 0 });
                        });

                        const current = new Date(startDate);
                        while (current <= endDate) {
                            const dateStr = toLocalISOString(current);
                            const dayData = dataMap.get(dateStr) || { count: 0, target: 0 };
                            filledData.push({
                                date: dateStr,
                                count: dayData.count,
                                target: dayData.target
                            });
                            current.setDate(current.getDate() + 1);
                        }
                        this.allDaysDataForChart = filledData;

                        // Reset initial count to 0 because we are showing the full history from the start
                        this.initialChartCount = 0;
                    } else {
                        this.allDaysDataForChart = [];
                    }

                    // Last 14 days logic
                    const activityMap = new Map<string, DayStat>();
                    allDaysData.forEach(d => activityMap.set(d.date, d));

                    const last14Days: DayStat[] = [];
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const formatDateKey = (date: Date) => {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        return `${y}-${m}-${d}`;
                    };

                    for (let i = 13; i >= 0; i--) {
                        const d = new Date(today);
                        d.setDate(today.getDate() - i);
                        const dateKey = formatDateKey(d);
                        const dayData = activityMap.get(dateKey);

                        last14Days.push({
                            date: dateKey,
                            count: dayData ? dayData.count : 0,
                            target: dayData ? (dayData.target || 0) : 0
                        });
                    }
                    this.activityData = last14Days;

                    this.prepareLineChart(this.allDaysDataForChart);
                    this.prepareHeatmap(allDaysData);
                } else {
                    this.resetToDefaults();
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('Error loading stats:', err);
                this.resetToDefaults();
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    resetToDefaults() {
        this.totalWords = 0;
        this.weeklyAvg = 0;
        this.bestDay = 0;
        this.currentStreak = 0;

        this.allDaysDataForChart = [];
        this.heatmapGrid = [];
        this.heatmapTooltip.visible = false;
        this.lineChartPoints = '';
        this.lineChartArea = '';
        this.lineChartDataPoints = [];
    }

    processMonthlyData(allDaysData: DayStat[]) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Get first and last day of current month
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

        // Helper to format date as YYYY-MM-DD
        const toLocalISOString = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        // Create a map of the data for quick lookup - store both count and target
        const dataMap = new Map<string, { count: number, target: number }>();
        allDaysData.forEach(d => {
            dataMap.set(d.date, { count: d.count, target: d.target || 0 });
        });

        // Generate all days of current month with data
        const monthlyData: DayStat[] = [];
        const current = new Date(firstDayOfMonth);

        while (current <= lastDayOfMonth) {
            const dateStr = toLocalISOString(current);
            const dayData = dataMap.get(dateStr) || { count: 0, target: 0 };
            monthlyData.push({
                date: dateStr,
                count: dayData.count,
                target: dayData.target
            });
            current.setDate(current.getDate() + 1);
        }

        this.monthlyData = monthlyData;
    }

    // NOTE: Streak calculation is now handled by the backend (login-based)
    // This method is kept for reference but should not be used
    // The backend calculates streak based on consecutive login days from user_logins table
    // Both profile and stats pages use response.data.currentStreak from getStats() API

    // --- SVG Charts Logic ---

    // Generate smooth Bezier curve for line chart
    prepareLineChart(data: DayStat[]) {
        if (!data || data.length === 0) {
            this.lineChartPoints = '';
            this.lineChartArea = '';
            this.lineChartDataPoints = [];
            return;
        }

        let cumulative = 0;
        const points: { x: number, y: number }[] = data.map((d, i) => {
            cumulative += d.count;
            return { x: i, y: cumulative };
        });

        const width = 800;
        const height = 200;
        const padding = 40; // Increased padding for labels

        const maxX = Math.max(points.length - 1, 1);
        const maxY = Math.max(points[points.length - 1].y * 1.1, 1); // Add 10% headroom, minimum 1

        // Helper to map data point to SVG coordinate
        const mapX = (x: number) => (x / maxX) * (width - padding * 2) + padding;
        const mapY = (y: number) => height - padding - (y / maxY) * (height - padding * 2);

        if (points.length < 2) {
            // Single point - draw a horizontal line
            const x = mapX(0);
            const y = mapY(points[0].y);
            this.lineChartPoints = `M ${x},${y} L ${width - padding},${y}`;
            this.lineChartArea = `M ${x},${y} L ${width - padding},${y} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;
            this.lineChartDataPoints = [{
                x: x,
                y: y,
                words: points[0].y,
                day: 1
            }];
            return;
        }

        // Store data points for tooltips
        this.lineChartDataPoints = points.map((p, i) => ({
            x: mapX(p.x),
            y: mapY(p.y),
            words: p.y,
            day: i + 1
        }));

        // Generate Path Command
        let d = `M ${mapX(points[0].x)},${mapY(points[0].y)}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];

            const x0 = mapX(p0.x);
            const y0 = mapY(p0.y);
            const x1 = mapX(p1.x);
            const y1 = mapY(p1.y);

            // Control points for smooth curve (approaching from horizontal)
            const cp1x = x0 + (x1 - x0) / 2;
            const cp1y = y0;
            const cp2x = x1 - (x1 - x0) / 2;
            const cp2y = y1;

            d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${y1}`;
        }

        this.lineChartPoints = d;
        this.lineChartArea = `${d} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;
    }

    // Helper for Grid Lines
    getGridLines(count: number = 5): number[] {
        // ... simple implementation for now, ideally dynamic based on max value
        return [0, 0.25, 0.5, 0.75, 1];
    }

    getYLabel(percent: number): string {
        const max = this.totalWords * 1.1;
        return Math.round(max * percent).toLocaleString();
    }

    getBarHeight(count: number): number {
        const max = Math.max(...this.activityData.map(d => d.count), 1);
        // Max height 100px
        return (count / max) * 100;
    }

    prepareHeatmap(allData: DayStat[]) {
        // Generate grid for current month only
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Get first and last day of current month
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

        // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        // Helper to format date as YYYY-MM-DD (local time)
        const toLocalISOString = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        // Create a lookup map for data - process ALL data from backend
        const dataMap = new Map<string, number>();
        if (allData && allData.length > 0) {
            allData.forEach(d => {
                // Backend returns dates as YYYY-MM-DD strings, use them directly
                // If it's a Date object, format it using local time
                let dateKey: string;
                if (typeof d.date === 'string') {
                    // Use date string directly, but ensure it's in YYYY-MM-DD format
                    dateKey = d.date.split('T')[0]; // Remove time part if present
                } else {
                    dateKey = toLocalISOString(new Date(d.date));
                }
                // Store the count, ensuring we use the maximum if there are duplicates
                const existingCount = dataMap.get(dateKey) || 0;
                dataMap.set(dateKey, Math.max(existingCount, d.count || 0));
            });
        }

        // First, calculate total words for the entire month and find max day count
        let monthTotal = 0;
        let maxDayCount = 0;
        const monthDays: ActivityDay[] = [];

        // Collect all day counts first to find max - process ALL days of the month (1 to daysInMonth)
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(currentYear, currentMonth, day);
            const dateKey = toLocalISOString(currentDate);
            const dayCount = dataMap.get(dateKey) || 0;
            monthTotal += dayCount;
            if (dayCount > maxDayCount) {
                maxDayCount = dayCount;
            }
        }

        // Calculate level thresholds based on max day count (divided into 5 ranges: 0-20%, 20-40%, 40-60%, 60-100%)
        // Each day's word count is compared to these thresholds
        // Since we have levels 0-4 (5 levels), we use: Level 0=no data, Level 1=0-20%, Level 2=20-40%, Level 3=40-60%, Level 4=60-100%
        const level1Threshold = maxDayCount * 0.20;  // 0-20% of max
        const level2Threshold = maxDayCount * 0.40;  // 20-40% of max
        const level3Threshold = maxDayCount * 0.60;  // 40-60% of max
        // Level 4 = 60-100% (anything above level3Threshold)

        // Now assign levels to each day based on its word count relative to max
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(currentYear, currentMonth, day);
            const dateKey = toLocalISOString(currentDate);
            const dayCount = dataMap.get(dateKey) || 0;

            // Calculate level based on day's word count relative to max day count (percentage-based)
            let level: 0 | 1 | 2 | 3 | 4 = 0;
            if (dayCount > 0 && maxDayCount > 0) {
                if (dayCount <= level1Threshold) {
                    level = 1;  // 0-20% of max
                } else if (dayCount <= level2Threshold) {
                    level = 2;  // 20-40% of max
                } else if (dayCount <= level3Threshold) {
                    level = 3;  // 40-60% of max
                } else {
                    level = 4;  // 60-100% of max
                }
            }

            monthDays.push({
                date: currentDate,
                count: dayCount,
                level: level
            });
        }

        // Now build the grid structure with empty days for alignment
        const weeks: ActivityDay[][] = [];
        let currentWeek: ActivityDay[] = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDate = new Date(firstDayOfMonth);
            emptyDate.setDate(firstDayOfMonth.getDate() - (firstDayOfWeek - i));
            currentWeek.push({
                date: emptyDate,
                count: 0,
                level: 0
            });
        }

        // Add all days of the current month
        for (const monthDay of monthDays) {
            currentWeek.push(monthDay);

            // If we've filled a week (7 days), start a new week
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        // Fill remaining days in the last week with empty cells
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                const emptyDate = new Date(lastDayOfMonth);
                emptyDate.setDate(lastDayOfMonth.getDate() + (currentWeek.length - (daysInMonth - (7 - firstDayOfWeek))));
                currentWeek.push({
                    date: emptyDate,
                    count: 0,
                    level: 0
                });
            }
            weeks.push(currentWeek);
        }

        this.heatmapGrid = weeks;
    }


    getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
        // This method is kept for backward compatibility but not used in heatmap
        if (count === 0) return 0;
        if (count < 500) return 1;
        if (count < 1000) return 2;
        if (count < 2000) return 3;
        return 4;
    }

    getFormattedDate(date: Date): string {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    isDayOutsideCurrentMonth(date: Date): boolean {
        const today = new Date();
        return date.getMonth() !== today.getMonth() || date.getFullYear() !== today.getFullYear();
    }

    isToday(date: Date): boolean {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }

    showHeatmapTooltip(event: MouseEvent, day: ActivityDay) {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        const containerRect = (event.target as HTMLElement).closest('.heatmap-card')?.getBoundingClientRect();

        if (containerRect) {
            this.heatmapTooltip = {
                visible: true,
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top - 45,
                date: this.getFormattedDate(day.date),
                count: day.count
            };
        }
    }

    hideHeatmapTooltip() {
        this.heatmapTooltip.visible = false;
    }

}
