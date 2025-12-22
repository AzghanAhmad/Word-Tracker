import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { MockDataService } from '../../services/mock-data.service';

interface ChecklistItem {
    id: number;
    text: string;
    is_done: boolean;
    sort_order: number;
}

interface Checklist {
    id: number;
    name: string;
    created_at: string;
    item_count: number;
    completed_count: number;
    items?: ChecklistItem[];
}

@Component({
    selector: 'app-my-checklists',
    standalone: true,
    imports: [CommonModule, RouterLink, ContentLoaderComponent],
    templateUrl: './my-checklists.component.html',
    styleUrls: ['./my-checklists.component.scss']
})
export class MyChecklistsComponent implements OnInit {
    checklists: Checklist[] = [];
    isLoading = true;

    // Pagination
    currentPage = 1;
    itemsPerPage = 10;
    totalItems = 0;
    totalPages = 1;

    constructor(private apiService: ApiService, private mockData: MockDataService) { }

    ngOnInit() {
        this.loadChecklists();
    }

    loadChecklists() {
        this.isLoading = true;
        const userType = localStorage.getItem('user_id') ? localStorage.getItem('user_type') : null;

        this.apiService.getChecklists().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const allChecklists = response.data;
                    this.checklists = allChecklists.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
                    this.totalItems = allChecklists.length;
                    this.totalPages = Math.ceil(allChecklists.length / this.itemsPerPage);
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading checklists:', err);
                if (userType === 'demo') {
                    const allChecklists = this.mockData.generateMockChecklistsWithItems(8);
                    this.checklists = allChecklists.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
                    this.totalItems = allChecklists.length;
                    this.totalPages = Math.ceil(allChecklists.length / this.itemsPerPage);
                } else {
                    this.checklists = [];
                    this.totalItems = 0;
                    this.totalPages = 1;
                }
                this.isLoading = false;
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
        this.itemsPerPage = Number(event.target.value);
        this.currentPage = 1;
        this.loadChecklists();
    }

    getCompletionPercentage(list: Checklist): number {
        if (!list.item_count || list.item_count === 0) return 0;
        return Math.round((list.completed_count / list.item_count) * 100);
    }

    toggleItem(listId: number, item: ChecklistItem) {
        const newValue = !item.is_done;
        this.apiService.updateChecklistItem(item.id, newValue).subscribe({
            next: (response) => {
                if (response.success) {
                    item.is_done = newValue;
                    // Update completed_count locally
                    const list = this.checklists.find(l => l.id === listId);
                    if (list) {
                        list.completed_count += newValue ? 1 : -1;
                    }
                }
            }
        });
    }

    deleteChecklist(id: number) {
        if (!confirm('Are you sure you want to delete this checklist?')) return;

        this.apiService.deleteChecklist(id).subscribe({
            next: (response) => {
                if (response.success) {
                    this.loadChecklists();
                } else {
                    alert('Error deleting checklist: ' + response.message);
                }
            },
            error: (err) => {
                console.error('Error deleting checklist:', err);
                alert('An error occurred while deleting the checklist.');
            }
        });
    }
}
