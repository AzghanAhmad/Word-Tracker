import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, of } from 'rxjs';
import { retry } from 'rxjs/operators';
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

    /**
     * Generic retry strategy for GET requests
     * Retries 3 times with specific delays
     */
    private get retryStrategy() {
        return retry({
            count: 3,
            delay: (error, retryCount) => timer(retryCount * 1000) // 1s, 2s, 3s
        });
    }

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
    // Dashboard & Stats
    // ============================================================================

    getDashboardStats(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: { totalPlans: 0, totalWords: 0, activePlans: 0, completedPlans: 0 } });
        }
        return this.http.get(`${this.apiUrl}/dashboard/stats`);
    }

    getRecentActivity(): Observable<any> {
        return this.http.get(`${this.apiUrl}/dashboard/activity`);
    }

    getStats(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: { totalWords: 0, weeklyAvg: 0, bestDay: 0, currentStreak: 0, activityData: [], allDaysData: [] } });
        }
        return this.http.get(`${this.apiUrl}/stats`);
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
        return this.http.post(`${this.apiUrl}/challenges/${challengeId}/join`, {});
    }

    joinChallengeByInviteCode(inviteCode: string): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Joined challenge by invite code (Mock)', challenge_id: 1 });
        }
        return this.http.post(`${this.apiUrl}/challenges/join-by-code`, { invite_code: inviteCode });
    }

    createChallenge(challenge: any): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Challenge created (Mock)', id: Math.floor(Math.random() * 1000) });
        }
        return this.http.post(`${this.apiUrl}/challenges`, challenge);
    }

    leaveChallenge(challengeId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/challenges/${challengeId}/leave`, {});
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

    updatePlan(id: number, plan: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/plans/${id}`, plan);
    }

    deletePlan(id: number): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Plan deleted (Mock)' });
        }
        return this.http.delete(`${this.apiUrl}/plans?id=${id}`);
    }

    getPlanDays(planId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/plans/${planId}/days`);
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

    getChecklist(id: number): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: null });
        }
        return this.http.get(`${this.apiUrl}/checklists?id=${id}`);
    }

    createChecklist(checklist: any): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Checklist created (Mock)', id: Math.floor(Math.random() * 1000) });
        }
        return this.http.post(`${this.apiUrl}/checklists`, checklist);
    }

    updateChecklist(id: number, checklist: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/checklists/${id}`, checklist);
    }

    updateChecklistItem(itemId: number, isDone: boolean): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Item updated (Mock)' });
        }
        return this.http.patch(`${this.apiUrl}/checklists/items/${itemId}`, { is_done: isDone });
    }

    logProgress(planId: number, date: string, actualCount: number, notes: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/plans/${planId}/days`, { date, actual_count: actualCount, notes });
    }

    deleteChecklist(checklistId: number): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Checklist deleted (Mock)' });
        }
        return this.http.delete(`${this.apiUrl}/checklists/${checklistId}`);
    }

    // ============================================================================
    // User Profile & Settings
    // ============================================================================

    getUserProfile(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: { username: 'Mock User', email: 'mock@example.com', bio: '' } });
        }
        return this.http.get(`${this.apiUrl}/user/profile`);
    }

    updateUserProfile(profile: { username: string; email: string; bio?: string }): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Profile updated (Mock)' });
        }
        return this.http.put(`${this.apiUrl}/user/profile`, profile);
    }

    changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Password changed (Mock)' });
        }
        return this.http.put(`${this.apiUrl}/user/password`, {
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword
        });
    }

    getUserSettings(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: {} });
        }
        return this.http.get(`${this.apiUrl}/user/settings`);
    }

    updateUserSettings(settings: any): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Settings updated (Mock)' });
        }
        return this.http.put(`${this.apiUrl}/user/settings`, settings);
    }

    deleteUserAccount(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Account deleted (Mock)' });
        }
        return this.http.delete(`${this.apiUrl}/user/account`);
    }

    // ============================================================================
    // Feedback
    // ============================================================================

    submitFeedback(type: string, email: string | null, message: string): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Feedback submitted (Mock)' });
        }
        return this.http.post(`${this.apiUrl}/feedback`, { type, email, message });
    }
}
