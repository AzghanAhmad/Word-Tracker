import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

interface ApiResponse {
    success?: boolean;
    message?: string;
    data?: any;
}

export const responseInterceptor: HttpInterceptorFn = (req, next) => {
    const notificationService = inject(NotificationService);

    return next(req).pipe(
        tap(event => {
            if (event instanceof HttpResponse) {
                // Automatically show success message if backend sends { success: true, message: "..." }
                const body = event.body as ApiResponse;
                if (body?.success && body?.message) {
                    // We've disabled automatic success messages from interceptor to avoid double alerts.
                    // Components should handle success messages explicitly.
                    // notificationService.showSuccess(body.message);
                }
            }
        }),
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'An unexpected error occurred';

            if (error.status === 0) {
                errorMessage = `Connection error: Cannot reach backend at ${req.url}. Please ensure the backend server is running on port 5200.`;
            } else {
                errorMessage = `Error ${error.status} (${error.statusText})`;

                if (error.error) {
                    if (typeof error.error === 'string') {
                        errorMessage += `: ${error.error}`;
                    } else if (error.error.message) {
                        errorMessage += `: ${error.error.message}`;
                    } else if (error.error.error) {
                        errorMessage += `: ${error.error.error}`;
                    }
                }
            }

            notificationService.showError(errorMessage);
            return throwError(() => error);
        })
    );
};
