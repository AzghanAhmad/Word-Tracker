import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-api-tester',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="api-tester">
            <h2>🧪 Create Plan API Tester</h2>
            
            <div class="test-section">
                <h3>Test Data</h3>
                <div class="form-group">
                    <label>User ID:</label>
                    <input type="number" [(ngModel)]="testData.user_id" />
                </div>
                <div class="form-group">
                    <label>Plan Name:</label>
                    <input type="text" [(ngModel)]="testData.name" />
                </div>
                <div class="form-group">
                    <label>Goal Amount:</label>
                    <input type="number" [(ngModel)]="testData.goal_amount" />
                </div>
                <div class="form-group">
                    <label>Start Date:</label>
                    <input type="date" [(ngModel)]="testData.start_date" />
                </div>
                <div class="form-group">
                    <label>End Date:</label>
                    <input type="date" [(ngModel)]="testData.end_date" />
                </div>
                
                <button (click)="testAPI()" class="test-btn">🚀 Test API Call</button>
            </div>
            
            <div class="results-section">
                <h3>Results</h3>
                <div class="status" [class.success]="lastResult?.success" [class.error]="lastResult && !lastResult.success">
                    <strong>Status:</strong> {{ getStatus() }}
                </div>
                <pre *ngIf="lastResult">{{ lastResult | json }}</pre>
                <pre *ngIf="lastError" class="error">{{ lastError | json }}</pre>
            </div>
            
            <div class="endpoint-info">
                <h3>API Endpoint</h3>
                <code>{{ apiUrl }}</code>
            </div>
        </div>
    `,
    styles: [`
        .api-tester {
            max-width: 800px;
            margin: 2rem auto;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        h2 {
            color: #333;
            margin-bottom: 1.5rem;
        }
        
        .test-section {
            background: #f9f9f9;
            padding: 1.5rem;
            border-radius: 4px;
            margin-bottom: 2rem;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: #555;
        }
        
        input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
        }
        
        .test-btn {
            background: #4CAF50;
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 1rem;
        }
        
        .test-btn:hover {
            background: #45a049;
        }
        
        .results-section {
            margin-bottom: 2rem;
        }
        
        .status {
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        pre {
            background: #f4f4f4;
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.875rem;
        }
        
        pre.error {
            background: #ffebee;
            color: #c62828;
        }
        
        .endpoint-info {
            background: #e3f2fd;
            padding: 1rem;
            border-radius: 4px;
        }
        
        code {
            background: #fff;
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
    `]
})
export class ApiTesterComponent {
    apiUrl = `${environment.apiUrl}/plans`;

    testData = {
        user_id: 1,
        name: 'Test Plan',
        goal_amount: 50000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        content_type: 'Novel',
        activity_type: 'Writing',
        strategy: 'steady',
        intensity: 'average'
    };

    lastResult: any = null;
    lastError: any = null;

    constructor(private http: HttpClient) { }

    testAPI() {
        console.log('🧪 Testing API with data:', this.testData);
        this.lastResult = null;
        this.lastError = null;

        this.http.post(this.apiUrl, this.testData)
            .subscribe({
                next: (response) => {
                    console.log('✅ API Success:', response);
                    this.lastResult = response;
                },
                error: (error) => {
                    console.error('❌ API Error:', error);
                    this.lastError = {
                        message: error.message,
                        status: error.status,
                        error: error.error
                    };
                }
            });
    }

    getStatus(): string {
        if (this.lastResult) {
            return this.lastResult.success ? '✅ SUCCESS' : '❌ FAILED';
        }
        if (this.lastError) {
            return '❌ NETWORK ERROR';
        }
        return 'Not tested yet';
    }
}
