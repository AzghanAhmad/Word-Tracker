namespace WordTracker.Api.Services;

public interface IDbService
{
    bool CreateUser(string username, string email, string passwordHash);
    (int id, string username, string passwordHash)? GetUserByEmail(string email);
    int CreatePlan(int userId, string title, int totalWordCount, string startDate, string endDate, string algorithmType, string? description, bool isPrivate, int startingPoint, string? measurementUnit, bool isDailyTarget, bool fixedDeadline, string? targetFinishDate, string? strategyIntensity, string? weekendApproach, int reserveDays, string displayViewType, string weekStartDay, string groupingType, string dashboardColor, bool showHistoricalData, string progressTrackingType);
    string GetPlansJson(int userId);
    string? GetPlanJson(int id, int userId);
    bool DeletePlan(int id, int userId);
    int CreateChecklist(int userId, int? planId, string name);
    string GetChecklistsJson(int userId);
    bool DeleteChecklist(int id, int userId);
    bool AddChecklistItem(int checklistId, string content);
    int CreateChallenge(int userId, string title, string description, string type, int goalCount, int durationDays, string startDate);
    string GetChallengesJson(int userId);
    string GetDashboardStatsJson(int userId);
}
