import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

@Component({
    selector: 'app-feedback',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './feedback.component.html',
    styleUrls: ['./feedback.component.scss']
})
export class FeedbackComponent implements OnInit {
    feedbackType: string = 'general';
    email: string = '';
    message: string = '';
    isSubmitting: boolean = false;
    submitted: boolean = false;

    constructor(
        private apiService: ApiService,
        private notificationService: NotificationService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    onSubmit(event: Event) {
        event.preventDefault();

        if (!this.message.trim()) {
            this.notificationService.showError('Please enter your feedback message.');
            return;
        }

        this.isSubmitting = true;
        this.cdr.detectChanges();

        const emailValue = this.email.trim() || null;

        this.apiService.submitFeedback(this.feedbackType, emailValue, this.message.trim()).subscribe({
            next: (response) => {
                if (response.success) {
                    this.submitted = true;
                    this.notificationService.showSuccess(response.message || 'Thank you for your feedback! We appreciate your input.');
                    // Reset form after showing success message
                    setTimeout(() => {
                        this.feedbackType = 'general';
                        this.email = '';
                        this.message = '';
                        this.submitted = false;
                        (event.target as HTMLFormElement).reset();
                        this.cdr.detectChanges();
                    }, 5000);
                } else {
                    this.notificationService.showError(response.message || 'Failed to submit feedback. Please try again.');
                }
                this.isSubmitting = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error submitting feedback:', error);
                const errorMsg = error.error?.message || 'Failed to submit feedback. Please try again.';
                this.notificationService.showError(errorMsg);
                this.isSubmitting = false;
                this.cdr.detectChanges();
            }
        });
    }
}
