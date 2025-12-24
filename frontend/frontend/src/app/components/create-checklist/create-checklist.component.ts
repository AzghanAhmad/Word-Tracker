import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

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

    constructor(private apiService: ApiService, private router: Router) { }

    ngOnInit() {
        // Check if user is logged in
        if (!localStorage.getItem('user_id')) {
            this.router.navigate(['/login']);
        }

        // Add initial empty item
        this.addItem();
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
        };

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
