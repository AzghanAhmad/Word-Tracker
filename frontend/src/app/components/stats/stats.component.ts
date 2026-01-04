import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { OutputStatsChartComponent } from './output-stats-chart/output-stats-chart.component';
import { DailyStatsChartComponent } from './daily-stats-chart/daily-stats-chart.component';
import { filter } from 'rxjs/operators';

interface DayStat {
    date: string;
    count: number;
}

interface ActivityDay {
    date: Date;
    count: number;
    level: 0 | 1 | 2 | 3 | 4; // 0=none, 4=high
}

@Component({
    selector: 'app-stats',
    standalone: true,
    imports: [CommonModule, NavbarComponent, ContentLoaderComponent, OutputStatsChartComponent, DailyStatsChartComponent],
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

    // Month labels for heatmap x-axis
    monthLabels: { label: string; offset: number }[] = [];

    constructor(
        private apiService: ApiService,
        private cdr: ChangeDetectorRef,
        private router: Router
    ) { }

    showTooltip(index: number) {
        this.activeTooltip = index;
        const point = this.lineChartDataPoints[index];
        if (point) {
            this.tooltipX = point.x + 10;
            this.tooltipY = point.y - 50;
        }
    }

    hideTooltip() {
        this.activeTooltip = null;
    }

    ngOnInit() {
        const userId = localStorage.getItem('user_id');
        if (!userId) {
            this.router.navigate(['/login']);
            return;
        }

        this.loadStats();

        // Reload on navigation back to this page
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

        this.apiService.getStats().subscribe({
            next: (response) => {
                console.log('Stats response:', response);
                if (response.success && response.data) {
                    const data = response.data;

                    // Set metrics
                    this.totalWords = data.totalWords || 0;
                    this.weeklyAvg = data.weeklyAvg || 0;
                    this.bestDay = data.bestDay || 0;
                    this.currentStreak = data.currentStreak || 0;

                    // Process activity data
                    let allDaysData: DayStat[] = (data.allDaysData || []).map((d: any) => ({
                        date: d.date,
                        count: d.count || 0
                    }));

                    // Calculate initial offset (Total Words - Sum of Fetched Period)
                    const fetchedTotal = allDaysData.reduce((sum, d) => sum + d.count, 0);
                    this.initialChartCount = Math.max(0, this.totalWords - fetchedTotal);

                    // Sort strict by date
                    allDaysData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    // Use ALL data points (start from the very first recorded day, active or not)
                    if (allDaysData.length > 0) {
                        const filledData: DayStat[] = [];

                        // Parse start date safely as local date
                        const startParts = allDaysData[0].date.split('-');
                        const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
                        const endDate = new Date(); // Today

                        // Normalize to midnight
                        startDate.setHours(0, 0, 0, 0);
                        endDate.setHours(0, 0, 0, 0);

                        // Helper for YYYY-MM-DD in local time
                        const toLocalISOString = (date: Date) => {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            return `${y}-${m}-${d}`;
                        };

                        // Safe map creation
                        const dataMap = new Map();
                        allDaysData.forEach(d => {
                            dataMap.set(d.date, d.count);
                        });

                        // Iterate day by day from Start to Today
                        const current = new Date(startDate);
                        while (current <= endDate) {
                            const dateStr = toLocalISOString(current);
                            filledData.push({
                                date: dateStr,
                                count: dataMap.get(dateStr) || 0
                            });
                            current.setDate(current.getDate() + 1);
                        }
                        this.allDaysDataForChart = filledData;
                    } else {
                        this.allDaysDataForChart = [];
                    }

                    // Last 14 days for bar chart
                    this.activityData = (data.activityData || []).map((d: any) => ({
                        date: d.date,
                        count: d.count || 0
                    }));

                    // Prepare Charts
                    this.prepareLineChart(allDaysData);
                    this.prepareHeatmap(allDaysData);
                    this.generateMonthLabels();
                } else {
                    // Fallback to empty data
                    this.resetToDefaults();
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
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
        this.activityData = [];
        this.monthlyData = [];
        this.allDaysDataForChart = [];
        this.heatmapGrid = [];
        this.monthLabels = [];
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

        // Create a map of the data for quick lookup
        const dataMap = new Map<string, number>();
        allDaysData.forEach(d => {
            dataMap.set(d.date, d.count);
        });

        // Generate all days of current month with data
        const monthlyData: DayStat[] = [];
        const current = new Date(firstDayOfMonth);
        
        while (current <= lastDayOfMonth) {
            const dateStr = toLocalISOString(current);
            monthlyData.push({
                date: dateStr,
                count: dataMap.get(dateStr) || 0
            });
            current.setDate(current.getDate() + 1);
        }

        this.monthlyData = monthlyData;
    }

    calculateStreak(data: DayStat[]): number {
        let streak = 0;
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].count > 0) streak++;
            else break;
        }
        return streak;
    }

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
        // Generate a 30-week grid ending at the current week
        const totalWeeks = 30;
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)

        // Align to the start of the current week (Sunday)
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - dayOfWeek);
        currentWeekStart.setHours(0, 0, 0, 0);

        // Calculate the start date of the grid (51 weeks ago)
        const gridStartDate = new Date(currentWeekStart);
        gridStartDate.setDate(gridStartDate.getDate() - ((totalWeeks - 1) * 7));

        // Create a lookup map for data
        const dataMap = new Map<string, number>();
        if (allData) {
            allData.forEach(d => {
                // Ensure date format consistency
                const dateKey = new Date(d.date).toISOString().split('T')[0];
                dataMap.set(dateKey, d.count);
            });
        }

        const weeks: ActivityDay[][] = [];

        for (let w = 0; w < totalWeeks; w++) {
            const week: ActivityDay[] = [];
            for (let d = 0; d < 7; d++) {
                const currentDate = new Date(gridStartDate);
                // Calculate date: Start + (Weeks * 7) + Days
                currentDate.setDate(gridStartDate.getDate() + (w * 7) + d);

                const dateKey = currentDate.toISOString().split('T')[0];
                const count = dataMap.get(dateKey) || 0;
                const level = this.getLevel(count);

                week.push({
                    date: currentDate,
                    count: count,
                    level: level
                });
            }
            weeks.push(week);
        }

        this.heatmapGrid = weeks;
    }

    getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
        if (count === 0) return 0;
        if (count < 500) return 1;
        if (count < 1000) return 2;
        if (count < 2000) return 3;
        return 4;
    }

    getFormattedDate(date: Date): string {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

    generateMonthLabels() {
        const labels: { label: string; offset: number }[] = [];
        const totalWeeks = 30;
        
        // Get the start date (30 weeks ago)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - dayOfWeek);
        currentWeekStart.setHours(0, 0, 0, 0);
        
        const gridStartDate = new Date(currentWeekStart);
        gridStartDate.setDate(gridStartDate.getDate() - ((totalWeeks - 1) * 7));
        
        // Week width in pixels (14px width + 3px gap)
        const weekWidth = 17;
        
        // Track months we've seen
        const seenMonths = new Set<string>();
        let currentMonth = gridStartDate.getMonth();
        let currentYear = gridStartDate.getFullYear();
        
        // Check first week
        const firstWeekMonth = gridStartDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!seenMonths.has(firstWeekMonth)) {
            labels.push({ label: gridStartDate.toLocaleDateString('en-US', { month: 'short' }), offset: 0 });
            seenMonths.add(firstWeekMonth);
            currentMonth = gridStartDate.getMonth();
            currentYear = gridStartDate.getFullYear();
        }
        
        // Check each week to see if we cross a month boundary
        for (let w = 1; w < totalWeeks; w++) {
            const weekDate = new Date(gridStartDate);
            weekDate.setDate(gridStartDate.getDate() + (w * 7));
            
            const monthKey = weekDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const monthName = weekDate.toLocaleDateString('en-US', { month: 'short' });
            
            // If we've entered a new month, add a label
            if (weekDate.getMonth() !== currentMonth || weekDate.getFullYear() !== currentYear) {
                if (!seenMonths.has(monthKey)) {
                    labels.push({ 
                        label: monthName, 
                        offset: w * weekWidth 
                    });
                    seenMonths.add(monthKey);
                    currentMonth = weekDate.getMonth();
                    currentYear = weekDate.getFullYear();
                }
            }
        }
        
        this.monthLabels = labels;
    }
}
