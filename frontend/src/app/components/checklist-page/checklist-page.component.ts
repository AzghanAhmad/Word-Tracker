import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface Task {
    id?: number;
    plan_id: number;
    text: string;
    date: string | null;
    order_index: number;
    is_completed: boolean;
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
    newTaskText: string = '';

    // UI State
    activeTab: 'schedule' | 'progress' | 'stats' = 'schedule';
    viewMode: 'daily' | 'weekly' | 'calendar' = 'weekly';
    taskViewMode: 'boxes' | 'list' | 'simple' = 'boxes';
    currentWeekStart: Date = new Date();
    selectedDate: Date = new Date();
    currentMonth: Date = new Date();

    // Options
    activities = ['Writing', 'Editing', 'Proofreading', 'Revising', 'Researching', 'Outlining'];
    contentTypes = ['Novel', 'Short Story', 'Thesis', 'Blog', 'Essay', 'Script', 'Non-Fiction'];
    strategies = [
        { id: 'steadily', label: 'Steadily' },
        { id: 'rising', label: 'Rising to the challenge' },
        { id: 'biting', label: 'Biting the bullet' },
        { id: 'mountain', label: 'Mountain hike' },
        { id: 'valley', label: 'Valley' },
        { id: 'oscillating', label: 'Oscillating' },
        { id: 'random', label: 'Randomly' }
    ];

    weekDays: Date[] = [];
    monthDays: Date[] = [];

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
                this.fetchTasks();
            }
        });
        this.currentMonth = new Date(this.selectedDate);
        this.generateWeekView();
        this.generateMonthView();
    }

    fetchPlanDetails() {
        this.apiService.getChecklist(this.planId).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.plan = response.data;
                    if (this.plan.start_date) this.plan.start_date = this.plan.start_date.split('T')[0];
                    if (this.plan.end_date) this.plan.end_date = this.plan.end_date.split('T')[0];
                    this.cdr.detectChanges();
                }
            },
            error: (err) => console.error('Error fetching checklist details:', err)
        });
    }

    fetchTasks() {
        this.apiService.getChecklist(this.planId).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const checklist = response.data;
                    this.tasks = checklist.items ? checklist.items.map((i: any) => ({
                        id: i.id,
                        plan_id: this.planId,
                        text: i.text || i.content || '',
                        date: i.date ? i.date.split('T')[0] : null,
                        order_index: i.sort_order || 0,
                        is_completed: i.is_completed || i.is_done || i.checked || false
                    })) : [];
                    this.sortTasks();
                    this.cdr.detectChanges();
                }
            },
            error: (err) => console.error('Error fetching checklist tasks:', err)
        });
    }

    sortTasks() {
        this.tasks.sort((a, b) => a.order_index - b.order_index);
    }

    saveAllTasks() {
        const payload = {
            name: this.plan.name || this.plan.title || 'My Checklist',
            plan_id: this.plan.plan_id || null,
            activity_type: this.plan.activity_type || null,
            content_type: this.plan.content_type || null,
            start_date: this.plan.start_date || null,
            end_date: this.plan.end_date || null,
            algorithm_type: this.plan.algorithm_type || null,
            items: this.tasks.map(t => ({
                id: t.id || null,
                text: t.text,
                checked: t.is_completed,
                date: t.date
            }))
        };
        this.apiService.updateChecklist(this.planId, payload).subscribe({
            next: (response) => {
                if (response.success) {
                    this.fetchPlanDetails();
                    this.fetchTasks();
                }
            },
            error: (err) => console.error('Error saving checklist tasks:', err)
        });
    }

    addTask() {
        if (!this.newTaskText.trim()) return;

        const newTask: Task = {
            plan_id: this.planId,
            text: this.newTaskText,
            date: null,
            order_index: this.tasks.length,
            is_completed: false
        };

        this.tasks.push(newTask);
        this.newTaskText = '';
        this.saveAllTasks();
    }

    deleteTask(task: Task) {
        const index = this.tasks.indexOf(task);
        if (index > -1) {
            this.tasks.splice(index, 1);
            this.saveAllTasks();
        }
    }

    updateTask(task: Task) {
        if (task.id) {
            this.apiService.updateChecklistItem(task.id, task.is_completed, task.date, task.text).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.fetchTasks();
                    } else {
                        console.error('Failed to update task');
                    }
                },
                error: (err) => console.error('Error updating task:', err)
            });
        } else {
            this.saveAllTasks();
        }
    }

    toggleTaskCompletion(task: Task) {
        task.is_completed = !task.is_completed;
        this.updateTask(task);
    }

    getCompletedCount(): number {
        return this.tasks.filter(t => t.is_completed).length;
    }

    getCompletedTasks(): Task[] {
        return this.tasks.filter(t => t.is_completed);
    }

    getCompletionPercentage(): number {
        if (this.tasks.length === 0) return 0;
        return Math.round((this.getCompletedCount() / this.tasks.length) * 100);
    }

    savePlan() {
        this.saveAllTasks();
        alert('Checklist and schedule saved!');
    }

    // Week View Logic
    generateWeekView() {
        this.weekDays = [];
        const start = new Date(this.currentWeekStart);
        // Adjust to Monday
        const day = start.getDay();
        const diff = start.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        start.setDate(diff);

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            this.weekDays.push(d);
        }
    }

    generateMonthView() {
        this.monthDays = [];
        const start = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const day = start.getDay();
        // Adjust start to the previous Sunday
        start.setDate(start.getDate() - day);

        // We want to generate 6 weeks (42 days) to cover the calendar grid completely
        for (let i = 0; i < 42; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            this.monthDays.push(d);
        }
    }

    prevWeek() {
        if (this.viewMode === 'weekly') {
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
            this.generateWeekView();
        } else if (this.viewMode === 'calendar') {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.generateMonthView();
        } else {
            this.selectedDate.setDate(this.selectedDate.getDate() - 1);
            this.currentWeekStart = new Date(this.selectedDate);
            this.generateWeekView();
        }
    }

    nextWeek() {
        if (this.viewMode === 'weekly') {
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
            this.generateWeekView();
        } else if (this.viewMode === 'calendar') {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.generateMonthView();
        } else {
            this.selectedDate.setDate(this.selectedDate.getDate() + 1);
            this.currentWeekStart = new Date(this.selectedDate);
            this.generateWeekView();
        }
    }

    today() {
        this.currentWeekStart = new Date();
        this.selectedDate = new Date();
        this.currentMonth = new Date();
        this.generateWeekView();
        this.generateMonthView();
    }

    getTasksForDate(date: Date): Task[] {
        const dateStr = this.formatDateLocal(date);
        return this.tasks.filter(t => t.date === dateStr);
    }

    isToday(date: Date): boolean {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    isSameDate(d1: Date, d2: Date): boolean {
        return d1.getDate() === d2.getDate() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getFullYear() === d2.getFullYear();
    }

    selectDate(date: Date) {
        this.selectedDate = new Date(date);
    }

    getWeekRangeString(): string {
        if (this.weekDays.length === 0) return '';
        const first = this.weekDays[0];
        const last = this.weekDays[this.weekDays.length - 1];
        
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const firstStr = first.toLocaleDateString('en-US', options);
        const lastStr = last.toLocaleDateString('en-US', { ...options, year: 'numeric' });
        
        return `${firstStr} – ${lastStr}`;
    }

    getMonthYearString(): string {
        const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
        return this.currentMonth.toLocaleDateString('en-US', options);
    }

    // Helper function to format date in local timezone (YYYY-MM-DD)
    private formatDateLocal(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Drag and Drop (Simple implementation)
    draggedTask: Task | null = null;

    onDragStart(event: DragEvent, task: Task) {
        this.draggedTask = task;
        event.dataTransfer?.setData('text/plain', JSON.stringify(task));
        event.dataTransfer!.effectAllowed = 'move';
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.dataTransfer!.dropEffect = 'move';
    }

    onDrop(event: DragEvent, targetTask: Task) {
        event.preventDefault();
        if (this.draggedTask && this.draggedTask !== targetTask) {
            const oldIndex = this.tasks.indexOf(this.draggedTask);
            const newIndex = this.tasks.indexOf(targetTask);

            // Move in array
            this.tasks.splice(oldIndex, 1);
            this.tasks.splice(newIndex, 0, this.draggedTask);

            // Update order indices
            this.tasks.forEach((t, index) => t.order_index = index);

            // Save new order
            this.saveAllTasks();

            this.draggedTask = null;
        }
    }
}
