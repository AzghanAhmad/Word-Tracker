import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
    imports: [CommonModule, FormsModule],
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
    viewMode: 'daily' | 'weekly' = 'weekly';
    currentWeekStart: Date = new Date();

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

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient
    ) { }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.planId = +params['id'];
            if (this.planId) {
                this.fetchPlanDetails();
                this.fetchTasks();
            }
        });
        this.generateWeekView();
    }

    fetchPlanDetails() {
        // Use ApiService to get plans from C backend
        // Tasks feature not yet implemented, so just show empty for now
        this.plan = {};
    }

    fetchTasks() {
        // Tasks feature not yet implemented in C backend
        this.tasks = [];
    }

    sortTasks() {
        this.tasks.sort((a, b) => a.order_index - b.order_index);
    }

    addTask() {
        if (!this.newTaskText.trim()) return;

        const newTask: Task = {
            plan_id: this.planId,
            text: this.newTaskText,
            date: null, // Default to unscheduled
            order_index: this.tasks.length,
            is_completed: false
        };

        // Tasks feature not yet implemented in C backend
        alert('Tasks feature coming soon!');
    }

    deleteTask(task: Task) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        // Tasks feature not yet implemented in C backend
        alert('Tasks feature coming soon!');
    }

    updateTask(task: Task) {
        // Tasks feature not yet implemented in C backend
    }

    savePlan() {
        // Implement plan update logic (similar to create_plan but update)
        // For now, just log or simple alert
        alert('Plan saved!');
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

    prevWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        this.generateWeekView();
    }

    nextWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        this.generateWeekView();
    }

    today() {
        this.currentWeekStart = new Date();
        this.generateWeekView();
    }

    getTasksForDate(date: Date): Task[] {
        const dateStr = date.toISOString().split('T')[0];
        return this.tasks.filter(t => t.date === dateStr);
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

            // Save new order (batch update ideally, but loop for now)
            this.tasks.forEach(t => this.updateTask(t));

            this.draggedTask = null;
        }
    }
}
