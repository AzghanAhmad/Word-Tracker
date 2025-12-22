import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    // Get token from localStorage
    const token = localStorage.getItem('token');

    // Skip adding Authorization for public auth endpoints
    const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
    if (isAuthEndpoint) {
        return next(req).pipe(
            tap({
                error: (error) => {
                    if (error.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user_id');
                        localStorage.removeItem('username');
                        localStorage.removeItem('email');
                        localStorage.removeItem('user_type');
                        router.navigate(['/login']);
                    }
                }
            })
        );
    }

    // If token exists, clone request and add Authorization header
    if (token) {
        const clonedRequest = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });

        return next(clonedRequest).pipe(
            tap({
                error: (error) => {
                    // Handle 401 Unauthorized - token expired or invalid
                    if (error.status === 401) {
                        // Clear all auth data
                        localStorage.removeItem('token');
                        localStorage.removeItem('user_id');
                        localStorage.removeItem('username');
                        localStorage.removeItem('email');
                        localStorage.removeItem('user_type');

                        // Redirect to login
                        router.navigate(['/login']);
                    }
                }
            })
        );
    }

    // If no token, proceed with original request
    return next(req);
};
