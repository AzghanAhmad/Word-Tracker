import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard = () => {
    const router = inject(Router);
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    // Check if both token and user_id exist
    if (token && userId) {
        return true;
    }

    // Clear any partial auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('user_type');

    // Redirect to login
    return router.parseUrl('/login');
};
