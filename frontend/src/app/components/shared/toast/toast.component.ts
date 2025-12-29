import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
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
export class ToastComponent implements OnInit, OnDestroy {
    toasts: ToastData[] = [];
    private subscription: Subscription | null = null;
    private lastMessage: string = '';
    private lastTime: number = 0;

    constructor(
        private notificationService: NotificationService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.subscription = this.notificationService.notification$.subscribe(toast => {
            this.addToast(toast);
        });
    }

    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    addToast(toast: ToastData) {
        const now = Date.now();
        // Prevent duplicate messages within 300ms
        if (toast.message === this.lastMessage && (now - this.lastTime) < 300) {
            return;
        }

        this.lastMessage = toast.message;
        this.lastTime = now;

        const id = now;
        const newToast = { ...toast, id };
        
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
            this.toasts.push(newToast);
            this.cdr.detectChanges();

            // Auto remove after 5 seconds
            setTimeout(() => {
                this.removeToast(id);
            }, 5000);
        }, 0);
    }

    removeToast(id: number | undefined) {
        if (!id) return;
        this.toasts = this.toasts.filter(t => t.id !== id);
    }
}
