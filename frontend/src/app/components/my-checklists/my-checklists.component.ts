import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { filter } from 'rxjs/operators';
import { formatDateKeyLocal, normalizeDateKeyFromApi, parseApiDateLocal } from '../../utils/date-key.util';

interface ProjectMetadata {
    id: number;
    title: string;
    genre: string;
    penName: string;
    targetLaunchDate: string;
    launchDateSource: 'meta' | 'end_date' | 'start_date' | 'tasks' | 'none';
    daysUntilLaunch: number;
    completionPercentage: number;
    nextMilestone: string;
    hasOverdue: boolean;
    tasks: any[];
}

interface OverdueTask {
    projectId: number;
    projectTitle: string;
    taskId: number;
    taskText: string;
    dueDate: string;
    daysOverdue: number;
}

interface FollowUpMilestone {
    projectId: number;
    projectTitle: string;
    taskId?: number;
    dueDays: number;
    dueDate: string;
    status: 'dormant' | 'active' | 'completed';
}

@Component({
    selector: 'app-my-checklists',
    standalone: true,
    imports: [CommonModule, RouterModule, ContentLoaderComponent],
    templateUrl: './my-checklists.component.html',
    styleUrls: ['./my-checklists.component.scss']
})
export class MyChecklistsComponent implements OnInit, OnDestroy {
    projects: ProjectMetadata[] = [];
    overdueTasks: OverdueTask[] = [];
    followUps: FollowUpMilestone[] = [];
    
    // Gantt / Runway state
    timelineWeeks: number = 13; // 13, 26, 52 weeks
    timelineStartDate: Date = new Date();
    timelineEndDate: Date = new Date();
    timelineDates: { name: string; date: Date }[] = [];
    overlapMilestoneDates: string[] = []; // YYYY-MM-DD that overlap

    isLoading = true;
    private routerSubscription: any;

    constructor(
        private apiService: ApiService,
        private cdr: ChangeDetectorRef,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadDashboardData();

        this.routerSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            if (event.urlAfterRedirects.includes('/my-checklists')) {
                this.loadDashboardData();
            }
        });
    }

    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
    }

    loadDashboardData() {
        this.isLoading = true;
        this.cdr.detectChanges();

        this.apiService.getChecklists().subscribe({
            next: (response) => {
                try {
                    if (response.success && response.data) {
                        const checklists = response.data || [];
                        this.projects = checklists.map((list: any) => {
                            if (!list) return null;
                            // Load rich metadata from localStorage
                            const savedMetaStr = localStorage.getItem(`authorflow_meta_${list.id}`);
                            let meta: any = null;
                            if (savedMetaStr) {
                                try { meta = JSON.parse(savedMetaStr); } catch (e) {}
                            }

                            const genre = meta?.genre || list.activity_type || 'Fiction';
                            const penName = meta?.penName || 'Author';
                            const metaTaskDetails: any[] = meta?.taskDetails || [];

                            // Parse tasks and statuses
                            const items = list.items || [];
                            const tasks = items.map((item: any) => {
                                if (!item) return null;
                                const localKey = `task_attr_${list.id}_${item.id}`;
                                const savedAttrStr = localStorage.getItem(localKey);
                                let localAttr: any = {};
                                if (savedAttrStr) {
                                    try { localAttr = JSON.parse(savedAttrStr); } catch (e) {}
                                }

                                const text = item.text || item.content || '';
                                const isCompleted = item.checked || item.is_completed || item.is_done;
                                const status = localAttr.status || (isCompleted ? 'completed' : 'unchecked');
                                const metaTask = metaTaskDetails.find((m: any) => m.text === text);
                                const textLower = text.toLowerCase();
                                const isMilestone = metaTask?.isMilestone
                                    ?? (textLower.includes('complete') || textLower.includes('launch') || textLower.includes('reveal'));

                                const formattedDate = normalizeDateKeyFromApi(item.date);

                                return {
                                    id: item.id,
                                    text: text,
                                    date: formattedDate,
                                    status: status,
                                    isMilestone: isMilestone,
                                    offsetDays: localAttr.offsetDays ?? metaTask?.offsetDays ?? 0
                                };
                            }).filter((t: any) => t !== null);

                            const { launchDate, source: launchDateSource } = this.resolveLaunchDate(list, meta, tasks);

                            // Calculate completion percentage excluding skipped
                            const activeTasks = tasks.filter(t => t.status !== 'skipped');
                            const completed = activeTasks.filter(t => t.status === 'completed').length;
                            const pct = activeTasks.length > 0 ? Math.round((completed / activeTasks.length) * 100) : 0;

                            // Countdown
                            let daysLeft = 0;
                            if (launchDate) {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const launch = parseApiDateLocal(launchDate);
                                if (launch) {
                                    launch.setHours(0, 0, 0, 0);
                                    daysLeft = Math.ceil((launch.getTime() - today.getTime()) / (1000 * 3600 * 24));
                                }
                            }

                            // Next Milestone
                            const upcomingMilestone = tasks.find(t => t.isMilestone && t.status !== 'completed' && t.status !== 'skipped');
                            const nextMil = upcomingMilestone ? upcomingMilestone.text : 'None';

                            // Has overdue
                            const todayStr = new Date().toISOString().split('T')[0];
                            const hasOverdue = tasks.some(t => t.status !== 'completed' && t.status !== 'skipped' && t.date && t.date < todayStr);

                            return {
                                id: list.id,
                                title: list.name || list.title || 'Untitled Book',
                                genre: genre,
                                penName: penName,
                                targetLaunchDate: launchDate,
                                launchDateSource: launchDateSource,
                                daysUntilLaunch: daysLeft,
                                completionPercentage: pct,
                                nextMilestone: nextMil,
                                hasOverdue: hasOverdue,
                                tasks: tasks
                            };
                        }).filter((p: any) => p !== null);

                        // Aggregate features
                        this.calculateOverdueAlerts();
                        this.calculateFollowUps();
                        this.buildRunwayTimeline();
                        this.detectMilestoneOverlaps();
                    }
                } catch (e) {
                    console.error('Error processing checklists dashboard data:', e);
                } finally {
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('API Error fetching checklists:', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    calculateOverdueAlerts() {
        this.overdueTasks = [];
        const today = new Date();
        today.setHours(0,0,0,0);

        this.projects.forEach(p => {
            if (!p || !p.tasks) return;
            p.tasks.forEach(t => {
                if (t.status !== 'completed' && t.status !== 'skipped' && t.date) {
                    const due = new Date(t.date);
                    if (!isNaN(due.getTime())) {
                        due.setHours(0,0,0,0);
                        if (due.getTime() < today.getTime()) {
                            const diffDays = Math.ceil((today.getTime() - due.getTime()) / (1000 * 3600 * 24));
                            this.overdueTasks.push({
                                projectId: p.id,
                                projectTitle: p.title,
                                taskId: t.id,
                                taskText: t.text,
                                dueDate: t.date,
                                daysOverdue: diffDays
                            });
                        }
                    }
                }
            });
        });

        // Sort by urgency (days overdue desc)
        this.overdueTasks.sort((a, b) => b.daysOverdue - a.daysOverdue);
    }

    calculateFollowUps() {
        this.followUps = [];
        this.projects.forEach(p => {
            if (!p || !p.targetLaunchDate) return;
            // Find the state of Day 30, 90, 180 follow ups
            [30, 90, 180].forEach(day => {
                const launch = new Date(p.targetLaunchDate);
                if (isNaN(launch.getTime())) {
                    return; // Skip invalid dates like "0000-00-00" or empty inputs
                }
                launch.setHours(0,0,0,0);
                const today = new Date();
                today.setHours(0,0,0,0);
                const diffDays = Math.floor((today.getTime() - launch.getTime()) / (1000 * 3600 * 24));

                const fmTask = p.tasks.find(t => t.text && t.text.toLowerCase().includes(`${day}-day`));
                let status: 'dormant' | 'active' | 'completed' = 'dormant';
                if (fmTask?.status === 'completed') status = 'completed';
                else if (diffDays >= day) status = 'active';

                // Calculate actual due date
                const dueDate = new Date(launch);
                dueDate.setDate(launch.getDate() + day);
                const dueDateStr = dueDate.toISOString().split('T')[0];

                this.followUps.push({
                    projectId: p.id,
                    projectTitle: p.title,
                    taskId: fmTask?.id,
                    dueDays: day,
                    dueDate: dueDateStr,
                    status: status
                });
            });
        });
    }

    completeTask(projectId: number, taskId: number, event: Event) {
        event.stopPropagation(); // prevent card from triggering navigation!
        
        // Find existing local attributes for this task if any
        const localKey = `task_attr_${projectId}_${taskId}`;
        const savedAttrStr = localStorage.getItem(localKey);
        let localAttr: any = {};
        if (savedAttrStr) {
            try {
                localAttr = JSON.parse(savedAttrStr);
            } catch (e) {}
        }
        localAttr.status = 'completed';
        localStorage.setItem(localKey, JSON.stringify(localAttr));

        // Call API
        this.apiService.updateChecklistItem(taskId, true).subscribe({
            next: () => {
                this.loadDashboardData();
            },
            error: (err) => console.error('Error completing task from dashboard:', err)
        });
    }
    /** Infer launch date from metadata, API fields, or task dates so the runway bar can render. */
    private resolveLaunchDate(list: any, meta: any, tasks: any[]): { launchDate: string; source: ProjectMetadata['launchDateSource'] } {
        const fromMeta = normalizeDateKeyFromApi(meta?.targetLaunchDate);
        if (fromMeta) return { launchDate: fromMeta, source: 'meta' };

        const fromEnd = normalizeDateKeyFromApi(list.end_date);
        if (fromEnd && fromEnd !== '0000-00-00') return { launchDate: fromEnd, source: 'end_date' };

        const fromStart = normalizeDateKeyFromApi(list.start_date);
        if (fromStart) {
            const d = parseApiDateLocal(fromStart)!;
            d.setDate(d.getDate() + 90);
            return { launchDate: formatDateKeyLocal(d), source: 'start_date' };
        }

        const launchTask = tasks.find(t => t.date && t.text?.toLowerCase().includes('launch'));
        if (launchTask?.date) return { launchDate: launchTask.date, source: 'tasks' };

        const datedTasks = tasks.filter(t => t.date).map(t => t.date as string).sort();
        if (datedTasks.length > 0) {
            return { launchDate: datedTasks[datedTasks.length - 1], source: 'tasks' };
        }

        return { launchDate: '', source: 'none' };
    }

    buildRunwayTimeline() {
        // Default range: today - 4 weeks through selected span
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 28);

        const end = new Date(start);
        end.setDate(end.getDate() + (this.timelineWeeks * 7));

        // Extend range so every project's lifecycle bar fits in view
        this.projects.forEach(p => {
            const range = this.getProjectTimelineRange(p);
            if (!range) return;
            if (range.start < start.getTime()) start.setTime(range.start);
            if (range.end > end.getTime()) end.setTime(range.end);
        });

        this.timelineStartDate = new Date(start);
        this.timelineEndDate = new Date(end);

        this.timelineDates = [];
        const current = new Date(this.timelineStartDate);
        while (current.getTime() < this.timelineEndDate.getTime()) {
            this.timelineDates.push({
                name: `Wk ${this.getWeekNumber(current)}`,
                date: new Date(current)
            });
            current.setDate(current.getDate() + 7);
        }
    }

    getWeekNumber(d: Date): number {
        const onejan = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    }

    getTodayLinePercentage(): number {
        const today = new Date().getTime();
        const start = this.timelineStartDate.getTime();
        const end = this.timelineEndDate.getTime();
        if (today < start || today > end) return -1;
        return ((today - start) / (end - start)) * 100;
    }

    /** Production runway: 90 days before launch through 30 days after. */
    private getProjectTimelineRange(project: ProjectMetadata): { start: number; end: number } | null {
        const launch = parseApiDateLocal(project.targetLaunchDate);
        if (!launch) return null;
        launch.setHours(0, 0, 0, 0);
        const dayMs = 24 * 3600 * 1000;
        return {
            start: launch.getTime() - (90 * dayMs),
            end: launch.getTime() + (30 * dayMs)
        };
    }

    showRunwayBar(project: ProjectMetadata): boolean {
        return this.getProjectBarWidth(project) > 0;
    }

    needsLaunchDateSetup(project: ProjectMetadata): boolean {
        return !project.targetLaunchDate || project.launchDateSource === 'none';
    }

    // Runway placement helpers
    getProjectBarLeft(project: ProjectMetadata): number {
        const range = this.getProjectTimelineRange(project);
        if (!range) return 0;

        const timelineStart = this.timelineStartDate.getTime();
        const timelineEnd = this.timelineEndDate.getTime();
        const span = timelineEnd - timelineStart;
        if (span <= 0) return 0;

        if (range.start <= timelineStart) return 0;
        return Math.min(100, Math.max(0, ((range.start - timelineStart) / span) * 100));
    }

    getProjectBarWidth(project: ProjectMetadata): number {
        const range = this.getProjectTimelineRange(project);
        if (!range) return 0;

        const timelineStart = this.timelineStartDate.getTime();
        const timelineEnd = this.timelineEndDate.getTime();
        const span = timelineEnd - timelineStart;
        if (span <= 0) return 0;

        const actualStart = Math.max(range.start, timelineStart);
        const actualEnd = Math.min(range.end, timelineEnd);
        if (actualEnd <= actualStart) return 0;

        return Math.min(100, Math.max(0, ((actualEnd - actualStart) / span) * 100));
    }

    getMilestoneMarkerPosition(project: ProjectMetadata, milestoneDateStr: string): number {
        if (!milestoneDateStr) return -1;
        const mDate = parseApiDateLocal(milestoneDateStr);
        if (!mDate) return -1;
        mDate.setHours(0, 0, 0, 0);
        const mTime = mDate.getTime();
        const start = this.timelineStartDate.getTime();
        const end = this.timelineEndDate.getTime();
        if (mTime < start || mTime > end) return -1;
        return ((mTime - start) / (end - start)) * 100;
    }

    getMilestoneTasks(project: ProjectMetadata): any[] {
        return project.tasks.filter(t => t.isMilestone && t.date);
    }

    detectMilestoneOverlaps() {
        this.overlapMilestoneDates = [];
        const dateCounts: { [key: string]: number } = {};

        this.projects.forEach(p => {
            p.tasks.forEach(t => {
                if (t.isMilestone && t.date) {
                    dateCounts[t.date] = (dateCounts[t.date] || 0) + 1;
                }
            });
        });

        Object.keys(dateCounts).forEach(date => {
            if (dateCounts[date] > 1) {
                this.overlapMilestoneDates.push(date);
            }
        });
    }

    isOverlap(dateStr: string): boolean {
        return this.overlapMilestoneDates.includes(dateStr);
    }

    zoomTimeline(weeks: number) {
        this.timelineWeeks = weeks;
        this.buildRunwayTimeline();
        this.cdr.detectChanges();
    }
}
