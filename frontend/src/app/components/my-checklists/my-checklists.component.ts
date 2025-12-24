import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { MockDataService } from '../../services/mock-data.service';
import { NotificationService } from '../../services/notification.service';

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
    updatingItems = new Set<number>(); // Track items being updated

    // Pagination
    currentPage = 1;
    itemsPerPage = 10;
    totalItems = 0;
    totalPages = 1;

    constructor(
        private apiService: ApiService, 
        private mockData: MockDataService,
        private notificationService: NotificationService
    ) { }

    ngOnInit() {
        this.loadChecklists();
    }

    loadChecklists() {
        this.isLoading = true;
        const userType = localStorage.getItem('user_id') ? localStorage.getItem('user_type') : null;

        this.apiService.getChecklists().subscribe({
            next: (response) => {
                console.log('Checklists API response:', response);
                if (response.success && response.data && Array.isArray(response.data)) {
                    // Process checklists to ensure items are properly formatted
                    const allChecklists = response.data.map((list: any) => ({
                        ...list,
                        items: list.items || [],
                        item_count: list.item_count || (list.items ? list.items.length : 0),
                        completed_count: list.completed_count || (list.items ? list.items.filter((i: any) => i.is_done || i.is_completed).length : 0)
                    }));
                    
                    console.log('Processed checklists:', allChecklists);
                    this.checklists = allChecklists.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
                    this.totalItems = allChecklists.length;
                    this.totalPages = Math.ceil(allChecklists.length / this.itemsPerPage);
                } else {
                    console.warn('Invalid checklists response:', response);
                    this.checklists = [];
                    this.totalItems = 0;
                    this.totalPages = 1;
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading checklists:', err);
                console.error('Error details:', err.error);
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
        // Prevent multiple simultaneous updates
        if (this.updatingItems.has(item.id)) {
            console.log(`Item ${item.id} is already being updated, skipping...`);
            return;
        }
        
        const oldValue = item.is_done;
        const newValue = !oldValue;
        
        // Mark as updating
        this.updatingItems.add(item.id);
        
        // Optimistically update UI (will revert if API call fails)
        item.is_done = newValue;
        const list = this.checklists.find(l => l.id === listId);
        if (list) {
            list.completed_count += newValue ? 1 : -1;
        }
        
        console.log(`Updating checklist item ${item.id}: is_done = ${newValue}`);
        
        this.apiService.updateChecklistItem(item.id, newValue).subscribe({
            next: (response) => {
                console.log('Checklist item update response:', response);
                
                // Always remove from updating set to stop spinner
                this.updatingItems.delete(item.id);
                
                if (response.success) {
                    console.log(`✅ Checklist item ${item.id} updated successfully`);
                    // Show success notification
                    const statusText = newValue ? 'completed' : 'marked as incomplete';
                    this.notificationService.showSuccess(`Task ${statusText} successfully`);
                } else {
                    // Revert on failure
                    console.error('Failed to update item:', response.message);
                    item.is_done = oldValue;
                    if (list) {
                        list.completed_count += oldValue ? 1 : -1;
                    }
                    const errorMsg = response.message || 'Unknown error';
                    this.notificationService.showError(`Failed to update task: ${errorMsg}`);
                }
            },
            error: (err) => {
                console.error('Error updating checklist item:', err);
                console.error('Error details:', err.error);
                
                // Always remove from updating set to stop spinner
                this.updatingItems.delete(item.id);
                
                // Revert UI changes on error
                item.is_done = oldValue;
                if (list) {
                    list.completed_count += oldValue ? 1 : -1;
                }
                
                let errorMsg = 'Failed to update task. Please try again.';
                if (err.error?.message) {
                    errorMsg = err.error.message;
                } else if (err.status === 401) {
                    errorMsg = 'You are not authenticated. Please log in again.';
                } else if (err.status === 404) {
                    errorMsg = 'Task not found.';
                }
                
                this.notificationService.showError(errorMsg);
            }
        });
    }
    
    isItemUpdating(itemId: number): boolean {
        return this.updatingItems.has(itemId);
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
