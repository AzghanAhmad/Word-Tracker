import { Component, ViewEncapsulation, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NavbarComponent {
    @Input() isPublic = false;
    @Input() isMenuOpen = false;
    @Output() toggleSidebarEvent = new EventEmitter<void>();

    constructor(private router: Router) { }

    toggleMobileMenu() {
        this.toggleSidebarEvent.emit();
    }

    closeMobileMenu() {
        this.isMenuOpen = false;
    }

    logout() {
        localStorage.removeItem('user_id');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        this.router.navigate(['/login']);
    }
}
