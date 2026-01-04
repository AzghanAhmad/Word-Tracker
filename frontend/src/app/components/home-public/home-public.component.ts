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

    constructor(
        private router: Router,
        private apiService: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('user_id')) {
            this.router.navigate(['/home']);
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
