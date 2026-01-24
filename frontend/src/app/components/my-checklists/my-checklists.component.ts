import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { filter } from 'rxjs/operators';

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
export class MyChecklistsComponent implements OnInit, OnDestroy {
    checklists: Checklist[] = [];
    username: string = 'User';
    isLoading = true;
    private routerSubscription: any;

    // Pagination
    currentPage = 1;
    itemsPerPage = 20;
    totalItems = 0;
    totalPages = 1;

    constructor(
        private apiService: ApiService,
        private cdr: ChangeDetectorRef,
        private router: Router
    ) { }

    ngOnInit() {
        this.username = localStorage.getItem('username') || 'User';
        // Load data immediately
        this.loadChecklists();

        // Reload on navigation back to this page
        this.routerSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            if (event.urlAfterRedirects === '/my-checklists' || event.urlAfterRedirects.startsWith('/my-checklists')) {
                console.log('Reloading checklists data on navigation');
                // Use setTimeout to ensure component is ready
                setTimeout(() => {
                    this.loadChecklists();
                }, 100);
            }
        });
    }

    ngOnDestroy() {
        // Clean up subscription
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
    }

    loadChecklists() {
        this.isLoading = true;
        this.cdr.detectChanges();

        this.apiService.getChecklists().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const allChecklists = response.data.map((list: any) => ({
                        ...list,
                        created_at: this.parseDate(list.created_at), // Parse date properly
                        items: list.items ? list.items.map((item: any) => ({
                            ...item,
                            is_done: item.is_done !== undefined ? item.is_done :
                                (item.checked !== undefined ? item.checked :
                                    (item.is_completed !== undefined ? item.is_completed : false))
                        })) : []
                    }));
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadChecklists();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    onPageSizeChange(event: any) {
        this.itemsPerPage = parseInt(event.target.value, 10);
        this.currentPage = 1;
        this.loadChecklists();
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        // Optimistic update
        const originalStatus = item.is_done;
        item.is_done = !originalStatus;
        this.cdr.detectChanges();

        this.apiService.updateChecklistItem(item.id, item.is_done).subscribe({
            next: (response) => {
                if (!response.success) {
                    // Rollback on server error
                    item.is_done = originalStatus;
                    this.cdr.detectChanges();
                    console.error('Failed to update item on server');
                }
            },
            error: (err) => {
                // Rollback on connection/API error
                item.is_done = originalStatus;
                this.cdr.detectChanges();
                console.error('Error updating checklist item:', err);
            }
        });
    }

    archiveChecklist(id: number) {
        if (confirm('Are you sure you want to archive this checklist?')) {
            this.apiService.archiveChecklist(id, true).subscribe({
                next: (response) => {
                    if (response.success) {
                        // Reload the checklists to reflect the change
                        this.loadChecklists();
                    }
                },
                error: (err) => {
                    console.error('Error archiving checklist:', err);
                    alert('Failed to archive checklist. Please try again.');
                }
            });
        }
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

    /**
     * Parse date from various formats (string, object, MySqlDateTime)
     */
    private parseDate(dateValue: any): Date | null {
        if (!dateValue) return null;

        // Handle JSON string containing MySqlDateTime object
        if (typeof dateValue === 'string' && dateValue.startsWith('{')) {
            try {
                const parsed = JSON.parse(dateValue);
                if (parsed.Year && parsed.Month && parsed.Day) {
                    return new Date(parsed.Year, parsed.Month - 1, parsed.Day);
                }
            } catch (e) {
                // If JSON parse fails, continue to other formats
            }
        }

        // Handle string dates (YYYY-MM-DD format from backend)
        if (typeof dateValue === 'string') {
            const dateStr = dateValue.split('T')[0]; // Remove time if present
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
            }
            // Try standard Date parsing
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? null : parsed;
        }

        // Handle MySqlDateTime-like objects (already parsed)
        if (dateValue && typeof dateValue === 'object') {
            if (dateValue.Year && dateValue.Month && dateValue.Day) {
                return new Date(dateValue.Year, dateValue.Month - 1, dateValue.Day);
            }
        }

        // Try standard Date parsing as fallback
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
}
