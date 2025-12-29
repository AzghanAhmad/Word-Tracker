import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-home-public',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './home-public.component.html',
    styleUrls: ['./home-public.component.scss']
})
export class HomePublicComponent implements OnInit {
    isMobileMenuOpen = false;
    newsletterEmail = '';
    isSubscribing = false;
    subscribeMessage = '';
    subscribeMessageClass = '';

    constructor(
        private router: Router,
        private apiService: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('user_id')) {
            this.router.navigate(['/plans']);
        }
    }

    toggleMobileMenu() {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
    }

    continueAsGuest() {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('user_id', 'guest');
            this.router.navigate(['/dashboard']);
        }
    }

    onSubscribe() {
        if (!this.newsletterEmail || !this.newsletterEmail.trim()) {
            this.subscribeMessage = 'Please enter a valid email address';
            this.subscribeMessageClass = 'error';
            setTimeout(() => {
                this.subscribeMessage = '';
            }, 3000);
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.newsletterEmail)) {
            this.subscribeMessage = 'Please enter a valid email address';
            this.subscribeMessageClass = 'error';
            setTimeout(() => {
                this.subscribeMessage = '';
            }, 3000);
            return;
        }

        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
            this.isSubscribing = true;
            this.subscribeMessage = '';
            this.cdr.detectChanges();

            this.apiService.subscribeNewsletter(this.newsletterEmail.trim()).subscribe({
                next: (response) => {
                    setTimeout(() => {
                        this.isSubscribing = false;
                        if (response.success) {
                            this.subscribeMessage = 'Thank you for subscribing! Check your email for confirmation.';
                            this.subscribeMessageClass = 'success';
                            this.newsletterEmail = '';
                        } else {
                            this.subscribeMessage = response.message || 'Failed to subscribe. Please try again.';
                            this.subscribeMessageClass = 'error';
                        }
                        this.cdr.detectChanges();
                        
                        setTimeout(() => {
                            this.subscribeMessage = '';
                            this.cdr.detectChanges();
                        }, 5000);
                    }, 0);
                },
                error: (error) => {
                    setTimeout(() => {
                        this.isSubscribing = false;
                        this.subscribeMessage = error.error?.message || 'Failed to subscribe. Please try again later.';
                        this.subscribeMessageClass = 'error';
                        this.cdr.detectChanges();
                        
                        setTimeout(() => {
                            this.subscribeMessage = '';
                            this.cdr.detectChanges();
                        }, 5000);
                    }, 0);
                }
            });
        }, 0);
    }
}
