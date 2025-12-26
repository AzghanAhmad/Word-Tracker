namespace WordTracker.Api.Services;

public interface IDbService
{
    bool CreateUser(string username, string email, string passwordHash);
    (int id, string username, string passwordHash)? GetUserByEmail(string email);
    (int id, string username, string passwordHash)? GetUserById(int userId);
    int CreatePlan(int userId, string title, int totalWordCount, string startDate, string endDate, string algorithmType, string? description, bool isPrivate, int startingPoint, string? measurementUnit, bool isDailyTarget, bool fixedDeadline, string? targetFinishDate, string? strategyIntensity, string? weekendApproach, int reserveDays, string displayViewType, string weekStartDay, string groupingType, string dashboardColor, bool showHistoricalData, string progressTrackingType, string? activityType, string? contentType);
    bool UpdatePlan(int planId, int userId, string title, int totalWordCount, string startDate, string endDate, string algorithmType, string? description, bool isPrivate, int startingPoint, string? measurementUnit, bool isDailyTarget, bool fixedDeadline, string? targetFinishDate, string? strategyIntensity, string? weekendApproach, int reserveDays, string displayViewType, string weekStartDay, string groupingType, string dashboardColor, bool showHistoricalData, string progressTrackingType, string? activityType, string? contentType);
    string GetPlansJson(int userId);
    string? GetPlanJson(int id, int userId);
    string GetPlanDaysJson(int planId, int userId);
    bool DeletePlan(int id, int userId);
    int CreateChecklist(int userId, int? planId, string name);
    int CreateChecklistWithItems(int userId, int? planId, string name, System.Text.Json.JsonElement[]? items);
    string GetChecklistsJson(int userId);
    string? GetChecklistJson(int id, int userId);
    bool UpdateChecklist(int id, int userId, string name, System.Text.Json.JsonElement[]? items);
    bool DeleteChecklist(int id, int userId);
    bool AddChecklistItem(int checklistId, string content);
    bool UpdateChecklistItem(int itemId, bool isDone);
    int CreateChallenge(int userId, string title, string description, string type, int goalCount, string startDate, string endDate, bool isPublic);
    string GetChallengesJson(int userId);
    string GetAllPublicChallengesJson(int userId);
    string? GetChallengeJson(int id, int userId);
    bool JoinChallenge(int challengeId, int userId);
    int? GetChallengeIdByInviteCode(string inviteCode);
    bool LeaveChallenge(int challengeId, int userId);
    bool UpdateChallengeProgress(int challengeId, int userId, int progress);
    bool DeleteChallenge(int id, int userId);
    string GetDashboardStatsJson(int userId);
    string GetPublicPlansJson(int userId);
    string? GetUserProfileJson(int userId);
    bool UpdateUserProfile(int userId, string username, string email, string? bio);
    bool UpdateUserPassword(int userId, string currentPasswordHash, string newPasswordHash);
    string? GetUserSettingsJson(int userId);
    bool UpdateUserSettings(int userId, string? dateFormat, string? weekStartDay, bool? emailRemindersEnabled, string? reminderTimezone, string? reminderFrequency, string? professionsJson);
    bool DeleteUserAccount(int userId);
    string GetStatsJson(int userId);
    int CreateFeedback(int? userId, string type, string? email, string message);
    int CreateProject(int userId, string name, string? subtitle, string? description, bool isPrivate);
    string GetProjectsJson(int userId);
    string? GetProjectJson(int id, int userId);
    bool UpdateProject(int id, int userId, string name, string? subtitle, string? description, bool isPrivate);
    bool DeleteProject(int id, int userId);
    string GetLastError();
}
