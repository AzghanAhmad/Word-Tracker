import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  onLogin() {
    console.log('🚀 onLogin called');
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;
    const loginUrl = `${environment.apiUrl}/auth/login`;
    console.log('📡 Sending request to:', loginUrl);
    console.log('📦 Data:', { email: this.email });

    this.apiService.login(this.email, this.password).subscribe({
      next: (result) => {
        console.log('✅ Login Response Received:', result);

        if (result.success && result.token) {
          console.log('🔑 Login Success! Navigating to dashboard...');
          localStorage.setItem('user_id', result.user.id.toString());
          localStorage.setItem('username', result.user.username);
          localStorage.setItem('email', this.email);
          localStorage.setItem('token', result.token);
          localStorage.removeItem('user_type');
          this.router.navigate(['/dashboard']);
        } else {
          console.warn('⚠️ Login Failed according to server logic:', result);
          this.errorMessage = result.message || 'Login failed. Please check your credentials.';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Login Error Event:', error);
        this.errorMessage = error.error?.message || `Network Error (${error.status}): Cannot reach backend at ${environment.apiUrl}`;
        this.isLoading = false;
      },
      complete: () => {
        console.log('🏁 Login request completed');
        this.isLoading = false;
      }
    });
  }

}
