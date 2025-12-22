import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastData } from '../../../services/notification.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss'],
    animations: [
        trigger('toastAnimation', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
            ])
        ])
    ]
})
export class ToastComponent implements OnInit {
    toasts: ToastData[] = [];

    constructor(private notificationService: NotificationService) { }

    ngOnInit(): void {
        this.notificationService.notification$.subscribe(toast => {
            this.addToast(toast);
        });
    }

    addToast(toast: ToastData) {
        const id = Date.now();
        const newToast = { ...toast, id };
        this.toasts.push(newToast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            this.removeToast(id);
        }, 5000);
    }

    removeToast(id: number | undefined) {
        if (!id) return;
        this.toasts = this.toasts.filter(t => t.id !== id);
    }
}
