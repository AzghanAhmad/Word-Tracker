import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private router: Router,
    private apiService: ApiService,
    private notificationService: NotificationService
  ) { }

  onRegister() {
    // Reset messages
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (!this.username || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }

    this.isLoading = true;

    console.log('🚀 Starting registration...');
    console.log('📧 Email:', this.email);
    console.log('👤 Username:', this.username);
    console.log('🔗 API URL:', `${environment.apiUrl}/auth/register`);

    this.apiService.register(this.username, this.email, this.password).subscribe({
      next: (result) => {
        console.log('✅ Register response:', result);

        if (result.success) {
          this.successMessage = 'Account created successfully! Redirecting to login...';
          this.notificationService.showSuccess('Account created successfully!');

          // Redirect after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.errorMessage = result.message || 'Registration failed. Please try again.';
          this.notificationService.showError(this.errorMessage);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Register error:', error);
        this.errorMessage = error.error?.message || 'Connection error. Please check if the backend server is running.';
        this.notificationService.showError(this.errorMessage);
        this.isLoading = false;
      }
    });
  }
}
