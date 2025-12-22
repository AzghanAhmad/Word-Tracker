import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastData {
    message: string;
    type: 'success' | 'error' | 'info';
    id?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationSubject = new Subject<ToastData>();
    notification$ = this.notificationSubject.asObservable();

    constructor() { }

    showSuccess(message: string) {
        this.show(message, 'success');
    }

    showError(message: string) {
        this.show(message, 'error');
    }

    showInfo(message: string) {
        this.show(message, 'info');
    }

    private show(message: string, type: 'success' | 'error' | 'info') {
        this.notificationSubject.next({ message, type });
    }
}
