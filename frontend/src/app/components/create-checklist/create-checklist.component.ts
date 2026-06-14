import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-create-checklist',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './create-checklist.component.html',
    styleUrls: ['./create-checklist.component.scss']
})
export class CreateChecklistComponent implements OnInit {
    checklistName: string = '';
    items: { id?: number; text: string; checked: boolean; date?: string }[] = [];
    newItemText: string = '';
    planId: number | null = null;
    isLoading: boolean = false;
    isLoadingData: boolean = false;

    activityType: string = 'Writing';
    contentType: string = 'Novel';
    startDate: string = '';
    endDate: string = '';
    algorithmType: string = 'steadily';

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

    // Edit Mode
    isEditMode = false;
    checklistId: number | null = null;

    constructor(
        private apiService: ApiService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        // Check if user is logged in
        if (!localStorage.getItem('user_id')) {
            this.router.navigate(['/login']);
            return;
        }

        // Load checklist immediately
        this.checkAndLoadChecklist();

        // Reload on navigation back to this page
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            if (event.url.includes('/create-checklist')) {
                this.checkAndLoadChecklist();
            }
        });
    }

    checkAndLoadChecklist() {
        // Check for route param ID (e.g., /create-checklist/:id)
        const routeId = this.route.snapshot.paramMap.get('id');

        // Check for query param ID (e.g., /create-checklist?edit=id)
        const queryId = this.route.snapshot.queryParamMap.get('edit');

        const id = routeId || queryId;

        if (id) {
            this.isEditMode = true;
            this.checklistId = Number(id);
            this.loadChecklist(this.checklistId);
        } else {
            // Reset form for new checklist
            this.isEditMode = false;
            this.checklistId = null;
            this.checklistName = '';
            this.items = [];
            this.planId = null;
            this.activityType = 'Writing';
            this.contentType = 'Novel';
            this.startDate = '';
            this.endDate = '';
            this.algorithmType = 'steadily';
            // Add initial empty item only for new creation
            this.addItem();
        }
    }

    loadChecklist(id: number) {
        this.isLoadingData = true;
        this.cdr.detectChanges();

        this.apiService.getChecklist(id).subscribe({
            next: (response) => {
                // console.log('Checklist response:', response);
                if (response.success && response.data) {
                    const checklist = response.data;
                    this.checklistName = checklist.name || checklist.title || '';
                    this.planId = checklist.plan_id || null;
                    this.activityType = checklist.activity_type || 'Writing';
                    this.contentType = checklist.content_type || 'Novel';
                    this.startDate = this.formatDateToString(checklist.start_date) || '';
                    this.endDate = this.formatDateToString(checklist.end_date) || '';
                    this.algorithmType = checklist.algorithm_type || 'steadily';
                    
                    this.items = checklist.items ? checklist.items.map((i: any) => {
                        // Support both checked, is_done, and is_completed for maximum compatibility
                        const isDone = i.checked !== undefined ? i.checked :
                            (i.is_done !== undefined ? i.is_done : i.is_completed);
                        return {
                            id: i.id,
                            text: i.text || i.content || '',
                            checked: !!isDone,
                            date: i.date ? i.date.split('T')[0] : ''
                        };
                    }) : [];

                    // Ensure at least one empty item if list is empty
                    if (this.items.length === 0) this.addItem();
                } else {
                    console.error('Checklist not found');
                    this.router.navigate(['/my-checklists']);
                }
                this.isLoadingData = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading checklist:', err);
                this.isLoadingData = false;
                this.cdr.detectChanges();
            }
        });
    }

    addItem() {
        this.items.push({ text: '', checked: false, date: '' });
        this.cdr.detectChanges();
    }

    removeItem(index: number) {
        this.items.splice(index, 1);
    }

    moveUp(index: number) {
        if (index > 0) {
            const temp = this.items[index];
            this.items[index] = this.items[index - 1];
            this.items[index - 1] = temp;
        }
    }

    moveDown(index: number) {
        if (index < this.items.length - 1) {
            const temp = this.items[index];
            this.items[index] = this.items[index + 1];
            this.items[index + 1] = temp;
        }
    }

    toggleItemStatus(item: any) {
        // Toggle locally first (optimistic UI)
        item.checked = !item.checked;
        this.cdr.detectChanges();

        // If in Edit Mode and item has an ID, save immediately to backend
        if (this.isEditMode && item.id) {
            this.apiService.updateChecklistItem(item.id, item.checked).subscribe({
                next: (response) => {
                    if (!response.success) {
                        // Revert on failure
                        item.checked = !item.checked;
                        console.error('Failed to update item status');
                        this.cdr.detectChanges();
                    }
                },
                error: (err) => {
                    // Revert on error
                    item.checked = !item.checked;
                    console.error('Error updating item status:', err);
                    this.cdr.detectChanges();
                }
            });
        }
    }

    saveChecklist() {
        if (!this.checklistName) {
            alert('Please enter a checklist name.');
            return;
        }

        // Filter out empty items
        const validItems = this.items.filter(item => item && item.text && item.text.trim() !== '');

        if (validItems.length === 0) {
            alert('Please add at least one item to the checklist.');
            return;
        }

        this.isLoading = true;
        this.cdr.detectChanges();

        const payload = {
            plan_id: this.planId,
            name: this.checklistName,
            activity_type: this.activityType,
            content_type: this.contentType,
            start_date: this.formatDateToString(this.startDate),
            end_date: this.formatDateToString(this.endDate),
            algorithm_type: this.algorithmType,
            items: validItems.map(it => ({
                id: it.id || null,
                text: it.text,
                checked: !!it.checked,
                date: this.formatDateToString(it.date)
            }))
        };

        if (this.isEditMode && this.checklistId) {
            this.apiService.updateChecklist(this.checklistId, payload).subscribe({
                next: (response) => {
                    if (response.success) {
                        alert('Checklist updated successfully.');
                        this.router.navigate(['/my-checklists']);
                    } else {
                        alert('Error updating checklist: ' + response.message);
                    }
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error updating checklist:', err);
                    alert('An error occurred while updating the checklist.');
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
            return;
        }

        this.apiService.createChecklist(payload).subscribe({
            next: (response) => {
                if (response.success) {
                    this.router.navigate(['/my-checklists']);
                } else {
                    alert('Error creating checklist: ' + response.message);
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error creating checklist:', err);
                alert('An error occurred while creating the checklist.');
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

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

    private formatDateToString(dateValue: any): string | null {
        const parsed = this.parseDate(dateValue);
        if (!parsed) return null;
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
