import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-feedback',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './feedback.component.html',
    styleUrls: ['./feedback.component.scss']
})
export class FeedbackComponent {
    onSubmit(event: Event) {
        event.preventDefault();
        // Simulate submission
        alert('Thank you for your feedback! We appreciate your input.');
        (event.target as HTMLFormElement).reset();
    }
}
