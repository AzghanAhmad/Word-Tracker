import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface Task {
    id: number;
    text: string;
    date: string | null;
    is_completed: boolean;
    // Premium metadata
    status: 'unchecked' | 'in-progress' | 'completed' | 'skipped';
    estimate: number; // in minutes
    defaultEstimate: number;
    isMilestone: boolean;
    milestoneName: string;
    notes: string;
    phase: string;
    offsetDays: number;
}

@Component({
    selector: 'app-checklist-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './checklist-page.component.html',
    styleUrls: ['./checklist-page.component.scss']
})
export class ChecklistPageComponent implements OnInit {
    planId: number = 0;
    plan: any = {};
    tasks: Task[] = [];
    Math = Math;
    
    // Project metadata
    genre: string = 'Fiction';
    penName: string = '';
    targetLaunchDate: string = '';
    daysUntilLaunch: number = 0;

    // UI state
    expandedPhases: { [key: string]: boolean } = {};
    activeMenuTaskId: number | null = null;
    showAddModal = false;
    private _errorMessage: string | null = null;
    private errorTimeoutId: any = null;

    get errorMessage(): string | null {
        return this._errorMessage;
    }

    set errorMessage(val: string | null) {
        this._errorMessage = val;
        if (this.errorTimeoutId) {
            clearTimeout(this.errorTimeoutId);
            this.errorTimeoutId = null;
        }
        if (val) {
            this.errorTimeoutId = setTimeout(() => {
                this._errorMessage = null;
            }, 3500);
        }
    }

    clearErrorMessage() {
        this.errorMessage = null;
    }
    
    // Override estimate modal
    showEstimateModal = false;
    modalTask: Task | null = null;
    customEstimateMinutes = 30;
    customOffsetDays = 0;

    // Inline Custom Item Builder State
    newCustomTaskText: string = '';
    newCustomTaskCategory: string = 'Pre-Writing & Research';
    newCustomTaskEstimateHours: number = 2;
    newCustomTaskOffset: number = -10;

    // Add task modal filter/navigation
    searchQuery: string = '';
    activeCategory: string = 'Pre-Writing & Research';
    categories = [
        'Pre-Writing & Research',
        'Writing & Drafting',
        'Editing & Manuscript Preparation',
        'Cover, Assets & Production',
        'Publishing Setup & Metadata',
        'ARC & Launch Team Plan',
        'Pre-Launch Marketing',
        'Launch Day & Launch Week',
        'Post-Launch',
        'Follow-Up Milestones'
    ];

    // Library for adding new items
    libraryTasks = [
        { text: 'Outline & Plotting', estimate: 240, isMilestone: false, phase: 'Pre-Writing & Research' },
        { text: 'Character Bios & Setting Profiles', estimate: 120, isMilestone: false, phase: 'Pre-Writing & Research' },
        { text: 'Market & Genre Research', estimate: 120, isMilestone: false, phase: 'Pre-Writing & Research' },
        { text: 'First Draft Completed', estimate: 3120, isMilestone: true, milestoneName: 'First Draft Complete', phase: 'Writing & Drafting' },
        { text: 'Self-Revision & Cleanup Pass', estimate: 480, isMilestone: false, phase: 'Writing & Drafting' },
        { text: 'Developmental Edit Review', estimate: 720, isMilestone: false, phase: 'Editing & Manuscript Preparation' },
        { text: 'Final Proofreading Pass Complete', estimate: 240, isMilestone: true, milestoneName: 'Proofreading Complete', phase: 'Editing & Manuscript Preparation' },
        { text: 'Cover Design Reveal & Promos', estimate: 120, isMilestone: true, milestoneName: 'Cover Reveal', phase: 'Cover, Assets & Production' },
        { text: 'Formatting eBook & Print versions', estimate: 120, isMilestone: false, phase: 'Cover, Assets & Production' }
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.planId = +params['id'];
            if (this.planId) {
                this.fetchPlanDetails();
            }
        });

        // Initialize collapsed phases
        this.categories.forEach(cat => {
            this.expandedPhases[cat] = true;
        });
    }

    fetchPlanDetails() {
        this.apiService.getChecklist(this.planId).subscribe({
            next: (response) => {
                try {
                    if (response.success && response.data) {
                        this.plan = response.data;
                        
                        // Fetch local metadata
                        const savedMetaStr = localStorage.getItem(`authorflow_meta_${this.planId}`);
                        let meta: any = null;
                        if (savedMetaStr) {
                            try {
                                meta = JSON.parse(savedMetaStr);
                                this.genre = meta.genre || 'Fiction';
                                this.penName = meta.penName || '';
                                this.targetLaunchDate = meta.targetLaunchDate || '';
                            } catch (e) {
                                console.error(e);
                            }
                        }

                        // Map tasks with high-fidelity attributes
                        const backendItems = response.data.items || [];
                        this.tasks = backendItems.map((item: any) => {
                            if (!item) return null;
                            const localTaskKey = `task_attr_${this.planId}_${item.id}`;
                            const savedAttrStr = localStorage.getItem(localTaskKey);
                            let localAttr: any = {};
                            if (savedAttrStr) {
                                try { localAttr = JSON.parse(savedAttrStr); } catch (e) {}
                            }

                            // Try to find default library info to populate phase, estimate, milestones
                            const text = item.text || item.content || '';
                            let libMatch = meta?.taskDetails?.find((d: any) => d.text === text);
                            if (!libMatch) {
                                // Find in current libraryTasks
                                libMatch = this.libraryTasks.find(t => t.text === text);
                            }
                            const status = localAttr.status || (item.checked ? 'completed' : 'unchecked');
                            const estimate = localAttr.estimate || libMatch?.estimate || libMatch?.defaultEstimate || 60;
                            const defaultEstimate = libMatch?.defaultEstimate || libMatch?.estimate || 60;
                            const isMilestone = libMatch ? !!libMatch.isMilestone : text.toLowerCase().includes('complete') || text.toLowerCase().includes('launch');
                            const milestoneName = libMatch?.milestoneName || (isMilestone ? text : '');
                            const phase = libMatch?.phase || this.inferPhaseFromText(text);
                            const offsetDays = localAttr.offsetDays !== undefined ? localAttr.offsetDays : (libMatch?.offsetDays !== undefined ? libMatch.offsetDays : this.inferOffsetDays(text));

                            let formattedDate: string | null = null;
                            if (item.date) {
                                if (typeof item.date === 'string') {
                                    formattedDate = item.date.split('T')[0];
                                } else {
                                    try {
                                        const d = new Date(item.date);
                                        if (!isNaN(d.getTime())) {
                                            formattedDate = d.toISOString().split('T')[0];
                                        }
                                    } catch (e) {}
                                }
                            }

                            return {
                                id: item.id,
                                text: text,
                                date: formattedDate,
                                is_completed: status === 'completed',
                                status: status,
                                estimate: estimate,
                                defaultEstimate: defaultEstimate,
                                isMilestone: isMilestone,
                                milestoneName: milestoneName,
                                notes: localAttr.notes || '',
                                phase: phase,
                                offsetDays: offsetDays
                            };
                        }).filter((t: any) => t !== null);

                        this.calculateLaunchCountdown();
                    }
                } catch (e) {
                    console.error('Error parsing checklist details:', e);
                } finally {
                    this.cdr.detectChanges();
                }
            },
            error: (err) => console.error('Error fetching checklist details:', err)
        });
    }

    inferPhaseFromText(text: string): string {
        const t = text.toLowerCase();
        if (t.includes('outline') || t.includes('plot') || t.includes('research')) return 'Pre-Writing & Research';
        if (t.includes('draft') || t.includes('write')) return 'Writing & Drafting';
        if (t.includes('edit') || t.includes('proof')) return 'Editing & Manuscript Preparation';
        if (t.includes('cover') || t.includes('format')) return 'Cover, Assets & Production';
        if (t.includes('kdp') || t.includes('upload') || t.includes('metadata')) return 'Publishing Setup & Metadata';
        if (t.includes('arc') || t.includes('review')) return 'ARC & Launch Team Plan';
        if (t.includes('teaser') || t.includes('social') || t.includes('promo')) return 'Pre-Launch Marketing';
        if (t.includes('launch') || t.includes('release')) return 'Launch Day & Launch Week';
        if (t.includes('post') || t.includes('thank')) return 'Post-Launch';
        if (t.includes('30-day') || t.includes('90-day') || t.includes('180-day')) return 'Follow-Up Milestones';
        return 'Pre-Writing & Research';
    }

    calculateLaunchCountdown() {
        if (!this.targetLaunchDate) {
            this.daysUntilLaunch = 0;
            return;
        }
        const today = new Date();
        today.setHours(0,0,0,0);
        const launch = new Date(this.targetLaunchDate);
        if (isNaN(launch.getTime())) {
            this.daysUntilLaunch = 0;
            return;
        }
        launch.setHours(0,0,0,0);
        const diff = launch.getTime() - today.getTime();
        this.daysUntilLaunch = Math.ceil(diff / (1000 * 3600 * 24));
    }

    // Effort summaries
    getTotalEstimatedHours(): number {
        const totalMin = this.tasks.reduce((sum, t) => sum + (t.status !== 'skipped' ? t.estimate : 0), 0);
        return Math.round((totalMin / 60) * 10) / 10;
    }

    getCompletionPercentage(): number {
        const activeTasks = this.tasks.filter(t => t.status !== 'skipped');
        if (activeTasks.length === 0) return 0;
        const completed = activeTasks.filter(t => t.status === 'completed').length;
        return Math.round((completed / activeTasks.length) * 100);
    }

    getHoursByPhase(phase: string): number {
        const phaseTasks = this.tasks.filter(t => t.phase === phase && t.status !== 'skipped');
        const min = phaseTasks.reduce((sum, t) => sum + t.estimate, 0);
        return Math.round((min / 60) * 10) / 10;
    }

    getHoursPerWeek(): number {
        const totalHours = this.getTotalEstimatedHours();
        // Calculate weeks between start of first task and target launch date
        const startDates = this.tasks.map(t => t.date).filter(d => !!d).map(d => new Date(d!).getTime());
        const minStart = startDates.length > 0 ? Math.min(...startDates) : new Date().getTime();
        const launch = this.targetLaunchDate ? new Date(this.targetLaunchDate).getTime() : new Date().getTime();
        
        const diffWeeks = Math.max(1, (launch - minStart) / (7 * 24 * 3600 * 1000));
        return Math.round((totalHours / diffWeeks) * 10) / 10;
    }

    getPhaseCompletionPercentage(phase: string): number {
        const phaseTasks = this.tasks.filter(t => t.phase === phase && t.status !== 'skipped');
        if (phaseTasks.length === 0) return 0;
        const completed = phaseTasks.filter(t => t.status === 'completed').length;
        return Math.round((completed / phaseTasks.length) * 100);
    }

    getPhaseCompletedCount(phase: string): number {
        return this.tasks.filter(t => t.phase === phase && t.status === 'completed').length;
    }

    getPhaseRemainingCount(phase: string): number {
        return this.tasks.filter(t => t.phase === phase && t.status !== 'completed' && t.status !== 'skipped').length;
    }

    getPhaseTasks(phase: string): Task[] {
        return this.tasks.filter(t => t.phase === phase);
    }

    togglePhase(phase: string) {
        this.expandedPhases[phase] = !this.expandedPhases[phase];
    }

    isOverdue(task: Task): boolean {
        if (task.status === 'completed' || task.status === 'skipped' || !task.date) return false;
        const today = new Date();
        today.setHours(0,0,0,0);
        const due = new Date(task.date);
        due.setHours(0,0,0,0);
        return due.getTime() < today.getTime();
    }

    changeTaskStatus(task: Task, newStatus: 'unchecked' | 'in-progress' | 'completed' | 'skipped') {
        task.status = newStatus;
        task.is_completed = newStatus === 'completed';
        
        // Sync local changes and update backend
        this.saveTaskLocalAttributes(task);
        this.apiService.updateChecklistItem(task.id, task.is_completed, task.date, task.text).subscribe({
            next: () => this.cdr.detectChanges()
        });
        this.activeMenuTaskId = null;
    }

    toggleTaskCompletion(task: Task) {
        if (task.status === 'unchecked') {
            this.changeTaskStatus(task, 'in-progress');
            setTimeout(() => {
                if (task.status === 'in-progress') {
                    this.changeTaskStatus(task, 'completed');
                }
            }, 1000);
        } else if (task.status === 'in-progress') {
            this.changeTaskStatus(task, 'completed');
        } else if (task.status === 'completed') {
            this.changeTaskStatus(task, 'unchecked');
        } else if (task.status === 'skipped') {
            this.changeTaskStatus(task, 'unchecked');
        }
    }

    updateTaskDetails(task: Task) {
        this.saveTaskLocalAttributes(task);
        this.apiService.updateChecklistItem(task.id, task.is_completed, task.date, task.text).subscribe({
            next: () => this.cdr.detectChanges()
        });
    }

    saveTaskLocalAttributes(task: Task) {
        const localKey = `task_attr_${this.planId}_${task.id}`;
        const data = {
            status: task.status,
            estimate: task.estimate,
            notes: task.notes,
            offsetDays: task.offsetDays
        };
        localStorage.setItem(localKey, JSON.stringify(data));
    }

    openEstimateModal(task: Task, event: Event) {
        event.stopPropagation();
        this.modalTask = task;
        this.customEstimateMinutes = task.estimate;
        this.customOffsetDays = task.offsetDays !== undefined ? task.offsetDays : 0;
        this.showEstimateModal = true;
    }

    saveCustomEstimate() {
        if (this.modalTask) {
            this.modalTask.estimate = this.customEstimateMinutes;
            this.modalTask.offsetDays = this.customOffsetDays;

            // Recalculate date if targetLaunchDate is available
            if (this.targetLaunchDate && this.modalTask.offsetDays !== undefined) {
                this.modalTask.date = this.calculateLaunchOffsetDate(this.targetLaunchDate, this.modalTask.offsetDays);
            }

            this.saveTaskLocalAttributes(this.modalTask);
            this.updateTaskDetails(this.modalTask);
        }
        this.showEstimateModal = false;
        this.modalTask = null;
        this.cdr.detectChanges();
    }

    archiveChecklist() {
        if (confirm('Are you sure you want to archive this checklist?')) {
            this.apiService.archiveChecklist(this.planId, true).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.router.navigate(['/my-checklists']);
                    } else {
                        this.errorMessage = res.message || 'Failed to archive checklist.';
                    }
                },
                error: (err) => {
                    console.error(err);
                    this.errorMessage = 'Server error occurred while archiving the checklist.';
                }
            });
        }
    }

    deleteChecklist() {
        if (confirm('Are you sure you want to permanently delete this checklist? This action cannot be undone.')) {
            this.apiService.deleteChecklist(this.planId).subscribe({
                next: (res) => {
                    if (res.success) {
                        localStorage.removeItem(`authorflow_meta_${this.planId}`);
                        this.router.navigate(['/my-checklists']);
                    } else {
                        this.errorMessage = res.message || 'Failed to delete checklist.';
                    }
                },
                error: (err) => {
                    console.error(err);
                    this.errorMessage = 'Server error occurred while deleting the checklist.';
                }
            });
        }
    }

    archiveTask(task: Task) {
        if (confirm('Are you sure you want to archive/remove this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== task.id);
            // Delete locally
            localStorage.removeItem(`task_attr_${this.planId}_${task.id}`);
            // Update backend by pushing current tasks list (standard update)
            const payload = {
                name: this.plan.name || this.plan.title,
                items: this.tasks.map(t => ({
                    id: t.id,
                    text: t.text,
                    checked: t.is_completed,
                    date: t.date
                }))
            };
            this.apiService.updateChecklist(this.planId, payload).subscribe({
                next: () => this.cdr.detectChanges()
            });
        }
        this.activeMenuTaskId = null;
    }

    toggleActionMenu(taskId: number, event: Event) {
        event.stopPropagation();
        if (this.activeMenuTaskId === taskId) {
            this.activeMenuTaskId = null;
        } else {
            this.activeMenuTaskId = taskId;
        }
    }

    // Follow up Milestones Engine UI
    getMilestoneEngineState(day: number): 'dormant' | 'active' | 'completed' {
        // Calculate days since launch
        if (!this.targetLaunchDate) return 'dormant';
        const today = new Date();
        today.setHours(0,0,0,0);
        const launch = new Date(this.targetLaunchDate);
        if (isNaN(launch.getTime())) return 'dormant';
        launch.setHours(0,0,0,0);
        const diffDays = Math.floor((today.getTime() - launch.getTime()) / (1000 * 3600 * 24));

        // Check if matching task is completed
        const textToMatch = `Day ${day}`.toLowerCase();
        const fmTask = this.tasks.find(t => t.phase === 'Follow-Up Milestones' && t.text && t.text.toLowerCase().includes(`${day}-day`));
        if (fmTask?.status === 'completed') return 'completed';

        if (diffDays >= day) {
            return 'active';
        }
        return 'dormant';
    }

    activateMilestone(day: number) {
        const fmTask = this.tasks.find(t => t.phase === 'Follow-Up Milestones' && t.text && t.text.toLowerCase().includes(`${day}-day`));
        if (fmTask && fmTask.status === 'unchecked') {
            this.changeTaskStatus(fmTask, 'in-progress');
        }
    }

    // Add Item Dialog
    openAddModal() {
        this.showAddModal = true;
    }

    getFilteredLibraryTasks(): any[] {
        return this.libraryTasks.filter(lt => {
            if (lt.phase !== this.activeCategory) return false;
            
            // Exclude already existing tasks in project
            if (this.tasks.some(t => t.text.toLowerCase() === lt.text.toLowerCase())) return false;
            
            if (this.searchQuery) {
                return lt.text.toLowerCase().includes(this.searchQuery.toLowerCase());
            }
            return true;
        });
    }
    addLibraryItem(libTask: any) {
        // Optimistically create new item ID
        const tempId = Math.floor(Math.random() * 100000);
        const newTask: Task = {
            id: tempId,
            text: libTask.text,
            date: this.plan.end_date || null,
            is_completed: false,
            status: 'unchecked',
            estimate: libTask.estimate,
            defaultEstimate: libTask.estimate,
            isMilestone: !!libTask.isMilestone,
            milestoneName: libTask.milestoneName || '',
            notes: '',
            phase: libTask.phase,
            offsetDays: libTask.offsetDays !== undefined ? libTask.offsetDays : this.inferOffsetDays(libTask.text)
        };

        this.tasks.push(newTask);
        this.saveTaskLocalAttributes(newTask);

        // Update backend
        const payload = {
            name: this.plan.name || this.plan.title,
            items: this.tasks.map(t => ({
                id: t.id < 100000 ? t.id : null, // send null for new items
                text: t.text,
                checked: t.is_completed,
                date: t.date
            }))
        };

        this.apiService.updateChecklist(this.planId, payload).subscribe({
            next: (res) => {
                this.fetchPlanDetails(); // Reload to get real backend IDs
            }
        });

        this.showAddModal = false;
    }

    addCustomChecklistItem() {
        if (!this.newCustomTaskText.trim()) {
            this.errorMessage = 'Please enter a task name.';
            return;
        }

        const estimateMinutes = Math.round(this.newCustomTaskEstimateHours * 60);
        const targetDate = this.targetLaunchDate 
            ? this.calculateLaunchOffsetDate(this.targetLaunchDate, this.newCustomTaskOffset) 
            : null;

        const tempId = Math.floor(Math.random() * 100000);
        const newTask: Task = {
            id: tempId,
            text: this.newCustomTaskText.trim(),
            date: targetDate,
            is_completed: false,
            status: 'unchecked',
            estimate: estimateMinutes,
            defaultEstimate: estimateMinutes,
            isMilestone: this.newCustomTaskText.toLowerCase().includes('complete') || this.newCustomTaskText.toLowerCase().includes('launch'),
            milestoneName: '',
            notes: '',
            phase: this.newCustomTaskCategory,
            offsetDays: this.newCustomTaskOffset
        };

        this.tasks.push(newTask);
        this.saveTaskLocalAttributes(newTask);

        // Update backend
        const payload = {
            name: this.plan.name || this.plan.title,
            items: this.tasks.map(t => ({
                id: t.id < 100000 ? t.id : null,
                text: t.text,
                checked: t.is_completed,
                date: t.date
            }))
        };

        this.apiService.updateChecklist(this.planId, payload).subscribe({
            next: (res) => {
                this.newCustomTaskText = ''; // Clear text input
                this.fetchPlanDetails(); // Reload to get real backend IDs
            }
        });
    }

    calculateLaunchOffsetDate(launchDateStr: string, offsetDays: number): string {
        if (!launchDateStr) return '';
        const date = new Date(launchDateStr);
        date.setDate(date.getDate() + offsetDays);
        return date.toISOString().split('T')[0];
    }

    inferOffsetDays(text: string): number {
        const t = text.toLowerCase();
        if (t.includes('30-day')) return 30;
        if (t.includes('90-day')) return 90;
        if (t.includes('180-day')) return 180;
        if (t.includes('launch') || t.includes('release')) return 0;
        if (t.includes('first draft')) return -60;
        if (t.includes('proofreading')) return -25;
        if (t.includes('cover')) return -30;
        if (t.includes('upload')) return -7;
        return -10; // default offset
    }

    getTaskEstimateLabel(task: Task): string {
        const est = task.estimate;
        if (est < 60) return `${est} min`;
        const hrs = est / 60;
        return `${hrs % 1 === 0 ? hrs : hrs.toFixed(1)} ${hrs === 1 ? 'hr' : 'hrs'}`;
    }
}
