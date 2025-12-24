import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

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
    isEditMode: boolean = false;
    checklistId: number | null = null;
    isLoadingData: boolean = false;

    constructor(
        private apiService: ApiService, 
        private router: Router,
        private route: ActivatedRoute,
        private notificationService: NotificationService
    ) { }

    ngOnInit() {
        // Check if user is logged in
        if (!localStorage.getItem('user_id')) {
            this.router.navigate(['/login']);
            return;
        }

        // Check if we're in edit mode
        this.route.queryParams.subscribe(params => {
            const editId = params['edit'];
            if (editId) {
                this.isEditMode = true;
                this.checklistId = +editId;
                this.loadChecklistData(+editId);
            } else {
                // Add initial empty item for new checklist
                this.addItem();
            }
        });
    }

    loadChecklistData(id: number) {
        this.isLoadingData = true;
        console.log(`📥 Loading checklist ${id} for editing`);
        
        this.apiService.getChecklist(id).subscribe({
            next: (response) => {
                console.log('✅ Checklist data loaded:', response);
                if (response.success && response.data) {
                    const checklist = response.data;
                    this.checklistName = checklist.name || '';
                    
                    // Ensure plan_id is a number or null (not an empty object)
                    const rawPlanId = checklist.plan_id;
                    if (rawPlanId && typeof rawPlanId === 'number') {
                        this.planId = rawPlanId;
                    } else if (rawPlanId && typeof rawPlanId === 'string' && !isNaN(parseInt(rawPlanId))) {
                        this.planId = parseInt(rawPlanId);
                    } else {
                        this.planId = null;
                    }
                    
                    console.log(`   Checklist name: ${this.checklistName}`);
                    console.log(`   Plan ID (raw):`, rawPlanId);
                    console.log(`   Plan ID (parsed):`, this.planId);
                    
                    // Load items
                    if (checklist.items && Array.isArray(checklist.items)) {
                        this.items = checklist.items.map((item: any) => ({
                            text: item.text || item.content || '',
                            is_done: item.is_done || item.is_completed || false
                        }));
                        console.log(`   Loaded ${this.items.length} items`);
                    } else {
                        this.items = [];
                        console.log('   No items found, starting with empty list');
                    }
                    
                    // Ensure at least one item
                    if (this.items.length === 0) {
                        this.addItem();
                    }
                    
                    console.log(`✅ Checklist loaded successfully: "${this.checklistName}" with ${this.items.length} items`);
                } else {
                    console.error('❌ Invalid response format:', response);
                    this.notificationService.showError('Failed to load checklist data');
                    this.router.navigate(['/my-checklists']);
                }
                this.isLoadingData = false;
            },
            error: (err) => {
                console.error('❌ Error loading checklist:', err);
                console.error('   Status:', err.status);
                console.error('   Error:', err.error);
                this.notificationService.showError('Failed to load checklist. Please try again.');
                this.isLoadingData = false;
                this.router.navigate(['/my-checklists']);
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
        console.log('🔵 saveChecklist() called');
        console.log('   isEditMode:', this.isEditMode);
        console.log('   checklistId:', this.checklistId);
        console.log('   checklistName:', this.checklistName);
        console.log('   items count:', this.items.length);
        
        // Validate checklist name
        if (!this.checklistName || this.checklistName.trim() === '') {
            console.log('❌ Validation failed: empty name');
            this.notificationService.showError('Please enter a checklist name.');
            return;
        }

        // Filter out empty items
        const validItems = this.items.filter(item => item.text && item.text.trim() !== '');
        console.log('   valid items count:', validItems.length);

        if (validItems.length === 0) {
            console.log('❌ Validation failed: no valid items');
            this.notificationService.showError('Please add at least one task to the checklist.');
            return;
        }

        this.isLoading = true;
        
        // Prepare payload matching backend expectations
        // Ensure plan_id is either a valid number or null (not an empty object)
        let planIdValue: number | null = null;
        if (this.planId && typeof this.planId === 'number') {
            planIdValue = this.planId;
        }
        
        const payload = {
            name: this.checklistName.trim(),
            plan_id: planIdValue,
            items: validItems.map(it => ({ 
                text: it.text.trim(),
                is_done: it.is_done || false
            }))
        };
        
        console.log('   Full payload:', payload);

        if (this.isEditMode && this.checklistId) {
            console.log('✅ Condition passed: isEditMode && checklistId');
            // Update existing checklist
            console.log(`🔄 Updating checklist ID: ${this.checklistId}`);
            console.log('Update payload:', JSON.stringify(payload, null, 2));
            console.log(`API URL will be: /api/checklists/${this.checklistId}`);
            
            this.apiService.updateChecklist(this.checklistId, payload).subscribe({
                next: (response) => {
                    console.log('✅ Checklist update response received:', response);
                    if (response.success) {
                        console.log('✅ Checklist updated successfully!');
                        this.notificationService.showSuccess('Checklist updated successfully!');
                        this.router.navigate(['/my-checklists']);
                    } else {
                        const errorMsg = response.message || 'Unknown error occurred';
                        console.error('❌ Checklist update failed:', errorMsg);
                        this.notificationService.showError('Error updating checklist: ' + errorMsg);
                    }
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('❌ Error updating checklist:', err);
                    console.error('Error status:', err.status);
                    console.error('Error statusText:', err.statusText);
                    console.error('Error body:', err.error);
                    console.error('Error URL:', err.url);
                    
                    let errorMsg = 'An error occurred while updating the checklist.';
                    if (err.error?.message) {
                        errorMsg = err.error.message;
                    } else if (err.message) {
                        errorMsg = err.message;
                    } else if (err.status === 401) {
                        errorMsg = 'You are not authenticated. Please log in again.';
                    } else if (err.status === 404) {
                        errorMsg = 'Checklist not found.';
                    } else if (err.status === 400) {
                        errorMsg = 'Invalid request. Please check your input.';
                    } else if (err.status === 500) {
                        errorMsg = 'Server error. Please try again later.';
                    }
                    
                    this.notificationService.showError(errorMsg);
                    this.isLoading = false;
                }
            });
        } else {
            // Create new checklist
            console.log('⚠️ Condition NOT passed: going to CREATE instead of UPDATE');
            console.log('   isEditMode:', this.isEditMode);
            console.log('   checklistId:', this.checklistId);
            console.log('Creating checklist with payload:', payload);
            this.apiService.createChecklist(payload).subscribe({
                next: (response) => {
                    console.log('Checklist creation response:', response);
                    if (response.success) {
                        this.notificationService.showSuccess('Checklist created successfully!');
                        this.router.navigate(['/my-checklists']);
                    } else {
                        const errorMsg = response.message || 'Unknown error occurred';
                        console.error('Checklist creation failed:', errorMsg);
                        this.notificationService.showError('Error creating checklist: ' + errorMsg);
                    }
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Error creating checklist:', err);
                    const errorMsg = err.error?.message || err.message || 'An error occurred while creating the checklist.';
                    this.notificationService.showError(errorMsg);
                    this.isLoading = false;
                }
            });
        }
    }
}
