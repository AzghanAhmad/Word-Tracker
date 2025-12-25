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
    items: { text: string; is_done: boolean }[] = [];
    newItemText: string = '';
    planId: number | null = null;
    isLoading: boolean = false;
    isLoadingData: boolean = false;

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
            // Add initial empty item only for new creation
            this.addItem();
        }
    }

    loadChecklist(id: number) {
        this.isLoadingData = true;
        this.cdr.detectChanges();
        
        this.apiService.getChecklist(id).subscribe({
            next: (response) => {
                console.log('Checklist response:', response);
                if (response.success && response.data) {
                    const checklist = response.data;
                    this.checklistName = checklist.name || checklist.title || '';
                    this.planId = checklist.plan_id || null;
                    this.items = checklist.items ? checklist.items.map((i: any) => ({
                        text: i.text || i.content || '',
                        is_done: i.is_done || false
                    })) : [];

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
        this.items.push({ text: '', is_done: false });
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

    saveChecklist() {
        if (!this.checklistName) {
            alert('Please enter a checklist name.');
            return;
        }

        // Filter out empty items
        const validItems = this.items.filter(item => item.text.trim() !== '');

        if (validItems.length === 0) {
            alert('Please add at least one item to the checklist.');
            return;
        }

        this.isLoading = true;
        const payload = {
            plan_id: this.planId,
            name: this.checklistName,
            items: validItems.map(it => ({ text: it.text }))
            // Note: C Backend update endpoint might differ, usually we need separate Update API logic
            // Assuming we reuse create logic or if there is an update endpoint
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
                },
                error: (err) => {
                    console.error('Error updating checklist:', err);
                    alert('An error occurred while updating the checklist.');
                    this.isLoading = false;
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
            },
            error: (err) => {
                console.error('Error creating checklist:', err);
                alert('An error occurred while creating the checklist.');
                this.isLoading = false;
            }
        });
    }
}
