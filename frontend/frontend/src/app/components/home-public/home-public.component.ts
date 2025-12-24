import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
    selector: 'app-home-public',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './home-public.component.html',
    styleUrls: ['./home-public.component.scss']
})
export class HomePublicComponent implements OnInit {
    isMobileMenuOpen = false;

    constructor(private router: Router) { }

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
}
