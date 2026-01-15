import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, of, Subject } from 'rxjs';
import { retry, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MockDataService } from './mock-data.service';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = this.resolveApiUrl();
    private _refreshSidebar = new Subject<void>();

    private resolveApiUrl(): string {
        // Check if config.js is loaded (for production)
        if (typeof (window as any).APP_CONFIG !== 'undefined' && (window as any).APP_CONFIG.apiUrl) {
            return (window as any).APP_CONFIG.apiUrl;
        }
        // Fallback to environment config
        return environment.apiUrl;
    }

    get refreshSidebar$() {
        return this._refreshSidebar.asObservable();
    }

    getApiUrl() {
        return this.apiUrl;
    }

    triggerRefreshSidebar() {
        this._refreshSidebar.next();
    }

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

    forgotPassword(email: string): Observable<any> {
        if (this.useMock) {
            return of({
                success: true,
                exists: true,
                message: 'Password reset email sent (Mock)',
                tempPassword: '123456'
            });
        }
        return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
    }

    forgotUsername(email: string): Observable<any> {
        if (this.useMock) {
            return of({
                success: true,
                exists: true,
                message: 'Username sent to email (Mock)',
                username: 'mockuser123'
            });
        }
        return this.http.post(`${this.apiUrl}/auth/forgot-username`, { email });
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

    getPublicChallenges(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/challenges/public`);
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

    updateChallengeProgress(challengeId: number, progress: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/challenges/${challengeId}/progress`, { progress });
    }

    getChallengeLogs(challengeId: number): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/challenges/${challengeId}/logs`);
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
            this._refreshSidebar.next();
            return of({ success: true, message: 'Plan created (Mock)', id: newPlan.id });
        }
        return this.http.post(`${this.apiUrl}/plans`, plan).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    updatePlan(id: number, plan: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/plans/${id}`, plan).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    archivePlan(id: number, isArchived: boolean): Observable<any> {
        return this.http.patch(`${this.apiUrl}/plans/${id}/archive`, { is_archived: isArchived }).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    deletePlan(id: number): Observable<any> {
        if (this.useMock) {
            this._refreshSidebar.next();
            return of({ success: true, message: 'Plan deleted (Mock)' });
        }
        return this.http.delete(`${this.apiUrl}/plans?id=${id}`).pipe(
            tap(() => this._refreshSidebar.next())
        );
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
        return this.http.post(`${this.apiUrl}/checklists`, checklist).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    updateChecklist(id: number, checklist: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/checklists/${id}`, checklist).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    updateChecklistItem(itemId: number, isDone: boolean): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Item updated (Mock)' });
        }
        return this.http.patch(`${this.apiUrl}/checklists/items/${itemId}`, { is_done: isDone }).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    logProgress(planId: number, date: string, actualCount: number, notes: string, targetCount?: number): Observable<any> {
        // Ensure actual_count is an integer (backend expects int)
        const actual_count = Math.round(actualCount || 0);
        
        // Ensure notes is a string (null or undefined becomes empty string)
        const notesValue = notes !== null && notes !== undefined ? notes : '';
        
        const payload: any = { 
            date: date, 
            actual_count: actual_count, 
            notes: notesValue 
        };
        
        // Only include target_count if it's a valid number
        if (targetCount !== undefined && targetCount !== null && !isNaN(targetCount)) {
            payload.target_count = Math.round(targetCount);
        }
        
        console.log('📤 Sending logProgress request:', { planId, payload });
        
        return this.http.post(`${this.apiUrl}/plans/${planId}/days`, payload).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    archiveChecklist(checklistId: number, isArchived: boolean): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Checklist archived (Mock)' });
        }
        return this.http.patch(`${this.apiUrl}/checklists/${checklistId}/archive`, { is_archived: isArchived }).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    getArchivedChecklists(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/checklists/archived`);
    }

    getArchivedPlans(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/plans/archived`);
    }

    deleteChecklist(checklistId: number): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Checklist deleted (Mock)' });
        }
        return this.http.delete(`${this.apiUrl}/checklists/${checklistId}`).pipe(
            tap(() => this._refreshSidebar.next())
        );
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

    uploadAvatar(file: File): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Avatar uploaded (Mock)', avatar_url: 'https://via.placeholder.com/150' });
        }
        const formData = new FormData();
        formData.append('avatar', file);
        return this.http.post(`${this.apiUrl}/user/avatar`, formData);
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

    // ============================================================================
    // Projects (Organization Plans)
    // ============================================================================

    createProject(project: { name: string, subtitle?: string, description?: string, is_private?: boolean }): Observable<any> {
        if (this.useMock) {
            this._refreshSidebar.next();
            return of({ success: true, message: 'Project created (Mock)' });
        }
        return this.http.post(`${this.apiUrl}/projects`, project).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    getProjects(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/projects`);
    }

    getProject(id: number): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: null });
        }
        return this.http.get(`${this.apiUrl}/projects/${id}`);
    }

    updateProject(id: number, project: { name?: string, subtitle?: string, description?: string, is_private?: boolean }): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Project updated (Mock)' });
        }
        return this.http.put(`${this.apiUrl}/projects/${id}`, project).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    archiveProject(id: number, isArchived: boolean): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Project archived (Mock)' });
        }
        return this.http.patch(`${this.apiUrl}/projects/${id}/archive`, { is_archived: isArchived }).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    deleteProject(id: number): Observable<any> {
        if (this.useMock) {
            this._refreshSidebar.next();
            return of({ success: true, message: 'Project deleted (Mock)' });
        }
        return this.http.delete(`${this.apiUrl}/projects/${id}`).pipe(
            tap(() => this._refreshSidebar.next())
        );
    }

    getArchivedProjects(): Observable<any> {
        if (this.useMock) {
            return of({ success: true, data: [] });
        }
        return this.http.get(`${this.apiUrl}/projects/archived`);
    }

    // ============================================================================
    // Newsletter
    // ============================================================================

    subscribeNewsletter(email: string): Observable<any> {
        if (this.useMock) {
            return of({ success: true, message: 'Newsletter subscription successful (Mock)' });
        }
        return this.http.post(`${this.apiUrl}/newsletter/subscribe`, { email });
    }
}
