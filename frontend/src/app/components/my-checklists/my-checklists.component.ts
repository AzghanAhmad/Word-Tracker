import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';

interface ChecklistItem {
    id: number;
    text: string;
    is_done: boolean;
}

interface Checklist {
    id: number;
    name?: string;  // Backend might use 'name'
    title?: string; // Or 'title'
    items: ChecklistItem[];
    created_at: string;
}

@Component({
    selector: 'app-my-checklists',
    standalone: true,
    imports: [CommonModule, RouterModule, ContentLoaderComponent],
    templateUrl: './my-checklists.component.html',
    styleUrls: ['./my-checklists.component.scss']
})
export class MyChecklistsComponent implements OnInit {
    checklists: Checklist[] = [];
    isLoading = true;

    // Pagination
    currentPage = 1;
    itemsPerPage = 6;
    totalItems = 0;
    totalPages = 1;

    constructor(
        private apiService: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.loadChecklists();
    }

    loadChecklists() {
        this.isLoading = true;
        this.cdr.detectChanges();

        this.apiService.getChecklists().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const allChecklists = response.data;
                    this.checklists = allChecklists.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
                    this.totalItems = allChecklists.length;
                    this.totalPages = Math.ceil(allChecklists.length / this.itemsPerPage);
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading checklists:', err);
                this.checklists = [];
                this.totalItems = 0;
                this.totalPages = 1;
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadChecklists();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadChecklists();
        }
    }

    onPageSizeChange(event: any) {
        this.itemsPerPage = parseInt(event.target.value, 10);
        this.currentPage = 1;
        this.loadChecklists();
    }

    getCompletionPercentage(list: Checklist): number {
        if (!list.items || list.items.length === 0) return 0;
        const completed = list.items.filter(item => item.is_done).length;
        return Math.round((completed / list.items.length) * 100);
    }

    getCompletedCount(list: Checklist): number {
        if (!list.items) return 0;
        return list.items.filter(item => item.is_done).length;
    }

    toggleItem(listId: number, item: ChecklistItem) {
        const newStatus = !item.is_done;
        this.apiService.updateChecklistItem(item.id, newStatus).subscribe({
            next: (response) => {
                if (response.success) {
                    item.is_done = newStatus;
                    const list = this.checklists.find(l => l.id === listId);
                    if (list) {
                        this.cdr.detectChanges();
                    }
                }
            },
            error: (err) => {
                console.error('Error updating checklist item:', err);
            }
        });
    }

    deleteChecklist(id: number) {
        if (confirm('Are you sure you want to delete this checklist?')) {
            this.apiService.deleteChecklist(id).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.loadChecklists();
                    }
                },
                error: (err) => {
                    console.error('Error deleting checklist:', err);
                }
            });
        }
    }
}
