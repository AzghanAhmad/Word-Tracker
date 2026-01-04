import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-forgot-username',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h2>Forgot Username</h2>
        <p>Enter your email address and we'll retrieve your username.</p>
        
        <!-- Success Message -->
        <div class="alert alert-success" *ngIf="successMessage">
          <i class="fas fa-check-circle"></i>
          {{ successMessage }}
          <div class="username-display" *ngIf="retrievedUsername">
            <strong>Your username:</strong>
            <code>{{ retrievedUsername }}</code>
            <p class="note">Use this to login to your account.</p>
          </div>
        </div>
        
        <!-- Error Message -->
        <div class="alert alert-error" *ngIf="errorMessage">
          <i class="fas fa-exclamation-circle"></i>
          {{ errorMessage }}
          <a routerLink="/register" class="register-link" *ngIf="showRegisterLink">Create an account</a>
        </div>
        
        <form (ngSubmit)="onSubmit()" *ngIf="!successMessage">
          <div class="form-group">
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email"
              placeholder="Email Address" 
              class="form-input"
              required>
          </div>
          <button type="submit" class="btn-primary" [disabled]="isLoading">
            <span *ngIf="!isLoading">Recover Username</span>
            <span *ngIf="isLoading">
              <i class="fas fa-spinner fa-spin"></i> Retrieving...
            </span>
          </button>
        </form>
        
        <div class="auth-footer">
          <a routerLink="/login">Back to Login</a>
          <span class="separator">|</span>
          <a routerLink="/forgot-password">Forgot Password?</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 2rem;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%);
    }
    .auth-card {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      width: 100%;
      max-width: 420px;
    }
    h2 { 
      margin-bottom: 0.5rem; 
      color: #1a202c; 
      font-size: 1.75rem;
    }
    p { 
      color: #64748b; 
      margin-bottom: 1.5rem; 
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .form-group { margin-bottom: 1rem; }
    .form-input {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .form-input:focus {
      outline: none;
      border-color: #1C2E4A;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .btn-primary {
      width: 100%;
      padding: 0.875rem;
      background: linear-gradient(135deg, #1C2E4A, #1C2E4A);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .auth-footer { 
      margin-top: 1.5rem; 
      text-align: center; 
    }
    .auth-footer a { 
      color: #1C2E4A; 
      text-decoration: none; 
      font-size: 0.9rem;
      font-weight: 500;
    }
    .auth-footer a:hover {
      text-decoration: underline;
    }
    .separator {
      margin: 0 0.75rem;
      color: #cbd5e1;
    }
    .alert {
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .alert i {
      margin-right: 0.5rem;
    }
    .alert-success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .alert-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .username-display {
      margin-top: 1rem;
      padding: 1rem;
      background: #f0fdf4;
      border-radius: 6px;
      text-align: center;
    }
    .username-display code {
      display: block;
      font-size: 1.25rem;
      font-weight: bold;
      color: #166534;
      margin: 0.5rem 0;
      padding: 0.5rem;
      background: white;
      border-radius: 4px;
    }
    .username-display .note {
      font-size: 0.85rem;
      color: #4b5563;
      margin: 0.5rem 0 0;
    }
    .register-link {
      display: block;
      margin-top: 0.5rem;
      color: #1C2E4A;
      text-decoration: none;
      font-weight: 500;
    }
    .register-link:hover {
      text-decoration: underline;
    }
  `]
})
export class ForgotUsernameComponent {
  email = '';
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  retrievedUsername = '';
  showRegisterLink = false;

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  onSubmit() {
    if (!this.email || !this.email.trim()) {
      this.errorMessage = 'Please enter your email address';
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.retrievedUsername = '';
    this.showRegisterLink = false;

    this.apiService.forgotUsername(this.email.trim()).subscribe({
      next: (response) => {
        setTimeout(() => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message;
            // For demo purposes - in production, this would be sent via email
            if (response.username) {
              this.retrievedUsername = response.username;
            }
          } else {
            if (response.exists === false) {
              this.errorMessage = response.message;
              this.showRegisterLink = true;
            } else {
              this.errorMessage = response.message || 'Failed to retrieve username. Please try again.';
            }
          }
          this.cdr.detectChanges();
        }, 0);
      },
      error: (error) => {
        setTimeout(() => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'An error occurred. Please try again later.';
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }
}
