import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
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
    imports: [CommonModule, NavbarComponent, ContentLoaderComponent],
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
    activityData: DayStat[] = []; // Last 14 days
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
                    const allDaysData: DayStat[] = (data.allDaysData || []).map((d: any) => ({
                        date: d.date,
                        count: d.count || 0
                    }));
                    
                    // Last 14 days for bar chart
                    this.activityData = (data.activityData || []).map((d: any) => ({
                        date: d.date,
                        count: d.count || 0
                    }));
                    
                    // Prepare Charts
                    this.prepareLineChart(allDaysData);
                    this.prepareHeatmap(allDaysData);
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
        this.heatmapGrid = [];
        this.lineChartPoints = '';
        this.lineChartArea = '';
        this.lineChartDataPoints = [];
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
        if (!allData || allData.length === 0) {
            this.heatmapGrid = [];
            return;
        }

        // github style heatmap (weeks x 7 days)
        // take last ~3 months
        const last90 = allData.slice(-60); // simplified 2 months

        // We need to group by week
        // This logic needs to align days correctly (Sunday to Saturday)
        // Simplified: Just 8 weeks column

        const weeks: ActivityDay[][] = [];
        let currentWeek: ActivityDay[] = [];

        // Fill up to start on correct day? 
        // For simplicity, let's just show raw columns of 7 days

        last90.forEach((d, i) => {
            const date = new Date(d.date);
            const level = this.getLevel(d.count);

            currentWeek.push({ date, count: d.count, level });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        if (currentWeek.length > 0) weeks.push(currentWeek);

        this.heatmapGrid = weeks;
    }

    getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
        if (count === 0) return 0;
        if (count < 500) return 1;
        if (count < 1000) return 2;
        if (count < 2000) return 3;
        return 4;
    }
}
