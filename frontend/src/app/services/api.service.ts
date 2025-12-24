import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // ============================================================================
    // Authentication
    // ============================================================================

    login(email: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
    }

    register(username: string, email: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/register`, { username, email, password });
    }

    // ============================================================================
    // User
    // ============================================================================

    getUserProfile(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/profile`);
    }

    // ============================================================================
    // Dashboard
    // ============================================================================

    getDashboardStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/dashboard/stats`);
    }

    // ============================================================================
    // Challenges
    // ============================================================================

    getChallenges(): Observable<any> {
        return this.http.get(`${this.apiUrl}/challenges`);
    }

    getPublicChallenges(): Observable<any> {
        return this.http.get(`${this.apiUrl}/challenges/public`);
    }

    getChallenge(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/challenges/${id}`);
    }

    joinChallenge(challengeId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/challenges/${challengeId}/join`, {});
    }

    leaveChallenge(challengeId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/challenges/${challengeId}/leave`, {});
    }

    updateChallengeProgress(challengeId: number, progress: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/challenges/${challengeId}/progress`, { progress });
    }

    createChallenge(challenge: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/challenges`, challenge);
    }

    deleteChallenge(challengeId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/challenges/${challengeId}`);
    }

    // ============================================================================
    // Plans
    // ============================================================================

    getPlans(): Observable<any> {
        return this.http.get(`${this.apiUrl}/plans`);
    }

    getPlan(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/plans?id=${id}`);
    }

    createPlan(plan: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/plans`, plan);
    }

    // ============================================================================
    // Community
    // ============================================================================

    getCommunityPosts(): Observable<any> {
        return this.http.get(`${this.apiUrl}/community`);
    }

    // ============================================================================
    // Notifications
    // ============================================================================

    getNotifications(): Observable<any> {
        return this.http.get(`${this.apiUrl}/notifications`);
    }

    // ============================================================================
    // Checklists
    // ============================================================================

    getChecklists(): Observable<any> {
        return this.http.get(`${this.apiUrl}/checklists`);
    }

    getChecklist(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/checklists?id=${id}`);
    }

    createChecklist(checklist: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/checklists`, checklist);
    }

    updateChecklist(id: number, checklist: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/checklists/${id}`, checklist);
    }

    updateChecklistItem(itemId: number, isDone: boolean): Observable<any> {
        return this.http.patch(`${this.apiUrl}/checklists/items/${itemId}`, { is_done: isDone });
    }

    deleteChecklist(checklistId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/checklists?id=${checklistId}`);
    }

}
