import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { MockDataService } from './mock-data.service';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    private get useMock(): boolean {
        return (environment as any).useMockData === true;
    }

    constructor(
        private http: HttpClient,
        private mockDataService: MockDataService
    ) { }

    // ============================================================================
    // Authentication
    // ============================================================================

    login(email: string, password: string): Observable<any> {
        if (this.useMock) {
            const user = this.mockDataService.generateMockUser();
            user.email = email;
            return of({
                success: true,
                token: 'mock-jwt-token-123456',
                user: user
            });
        }
        return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
    }

    register(username: string, email: string, password: string): Observable<any> {
        if (this.useMock) {
            return of({
                success: true,
                message: 'User registered successfully (Mock)'
            });
        }
        return this.http.post(`${this.apiUrl}/auth/register`, { username, email, password });
    }

    // ============================================================================
    // User
    // ============================================================================

    getUserProfile(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: this.mockDataService.generateMockUser() });
        }
        return this.http.get(`${this.apiUrl}/user/profile`);
    }

    // ============================================================================
    // Dashboard
    // ============================================================================

    getDashboardStats(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: { totalPlans: 0, totalWords: 0, activePlans: 0, completedPlans: 0 } });
        }
        return this.http.get(`${this.apiUrl}/dashboard/stats`);
    }

    // ============================================================================
    // Challenges
    // ============================================================================

    getChallenges(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/challenges`);
    }

    getChallenge(id: number): Observable<any> {
        if (this.useMock) {
            return of({ success: false, message: 'Challenge not found' });
        }
        return this.http.get(`${this.apiUrl}/challenges/${id}`);
    }

    joinChallenge(challengeId: number): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Joined challenge (Mock)' });
        }
        return this.http.post(`${this.apiUrl}/challenges/join`, { challenge_id: challengeId });
    }

    createChallenge(challenge: any): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Challenge created (Mock)', id: Math.floor(Math.random() * 1000) });
        }
        return this.http.post(`${this.apiUrl}/challenges`, challenge);
    }

    // ============================================================================
    // Plans
    // ============================================================================

    getPlans(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: this.mockDataService.getPlans() });
        }
        return this.http.get(`${this.apiUrl}/plans`);
    }

    getPlan(id: number): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: this.mockDataService.getPlan(id) });
        }
        return this.http.get(`${this.apiUrl}/plans?id=${id}`);
    }

    createPlan(plan: any): Observable<any> {
        if (this.useMock) {
            const newPlan = this.mockDataService.addPlan(plan);
            return of({ success: true, message: 'Plan created (Mock)', id: newPlan.id });
        }
        return this.http.post(`${this.apiUrl}/plans`, plan);
    }

    // ============================================================================
    // Community
    // ============================================================================

    getCommunityPosts(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/community`);
    }

    // ============================================================================
    // Notifications
    // ============================================================================

    getNotifications(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/notifications`);
    }

    // ============================================================================
    // Checklists
    // ============================================================================

    getChecklists(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/checklists`);
    }

    createChecklist(checklist: any): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Checklist created (Mock)', id: Math.floor(Math.random() * 1000) });
        }
        return this.http.post(`${this.apiUrl}/checklists`, checklist);
    }

    updateChecklistItem(itemId: number, isDone: boolean): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Item updated (Mock)' });
        }
        return this.http.patch(`${this.apiUrl}/checklists/items/${itemId}`, { is_done: isDone });
    }

    deleteChecklist(checklistId: number): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Checklist deleted (Mock)' });
        }
        return this.http.delete(`${this.apiUrl}/checklists/${checklistId}`);
    }
}
