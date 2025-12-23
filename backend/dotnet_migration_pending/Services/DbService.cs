using MySqlConnector;
using System.Text.Json;

namespace WordTracker.Api.Services;

public class DbService : IDbService
{
    private readonly string _connectionString;
    private string _lastError = string.Empty;

    public DbService(string connectionString)
    {
        _connectionString = connectionString;
    }

    /// <summary>
    /// Gets the last error message from database operations
    /// </summary>
    public string GetLastError() => _lastError;

    public bool CreateUser(string username, string email, string passwordHash)
    {
        try
        {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "INSERT INTO users (username,email,password_hash) VALUES (@u,@e,@p)";
        cmd.Parameters.AddWithValue("@u", username);
        cmd.Parameters.AddWithValue("@e", email);
        cmd.Parameters.AddWithValue("@p", passwordHash);
        return cmd.ExecuteNonQuery() == 1;
        }
        catch (MySqlException ex) when (ex.Number == 1062) // Duplicate entry
        {
            return false;
        }
        catch
        {
            return false;
        }
    }

    public (int id, string username, string passwordHash)? GetUserByEmail(string email)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id,username,password_hash FROM users WHERE email=@e LIMIT 1";
        cmd.Parameters.AddWithValue("@e", email);
        using var reader = cmd.ExecuteReader();
        if (reader.Read())
        {
            return (reader.GetInt32(0), reader.GetString(1), reader.GetString(2));
        }
        return null;
    }

    /// <summary>
    /// Creates a new writing plan for a user
    /// Returns the ID of the created plan, or -1 if creation failed
    /// </summary>
    public int CreatePlan(int userId, string title, int totalWordCount, string startDate, string endDate, string algorithmType, string? description, bool isPrivate, int startingPoint, string? measurementUnit, bool isDailyTarget, bool fixedDeadline, string? targetFinishDate, string? strategyIntensity, string? weekendApproach, int reserveDays, string displayViewType, string weekStartDay, string groupingType, string dashboardColor, bool showHistoricalData, string progressTrackingType)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Verify user exists first
            using (var checkCmd = conn.CreateCommand())
            {
                checkCmd.CommandText = "SELECT COUNT(*) FROM users WHERE id=@uid";
                checkCmd.Parameters.AddWithValue("@uid", userId);
                var userExists = Convert.ToInt32(checkCmd.ExecuteScalar()) > 0;
                if (!userExists)
                {
                    _lastError = $"User with ID {userId} does not exist";
                    Console.WriteLine($"User {userId} not found in database");
                    return -1;
                }
            }
            
            using var cmd = conn.CreateCommand();
            
            // Insert plan with all configuration options
            cmd.CommandText = @"INSERT INTO plans
                (user_id,title,total_word_count,start_date,end_date,algorithm_type,description,is_private,starting_point,measurement_unit,is_daily_target,fixed_deadline,target_finish_date,strategy_intensity,weekend_approach,reserve_days,display_view_type,week_start_day,grouping_type,dashboard_color,show_historical_data,progress_tracking_type)
                VALUES (@user_id,@title,@total,@start,@end,@algo,@desc,@priv,@startp,@meas,@daily,@fixed,@target,@strat,@weekend,@reserve,@view,@wstart,@group,@color,@hist,@track);
                SELECT LAST_INSERT_ID();";
            
            // Set parameters with proper null handling
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@title", title);
            cmd.Parameters.AddWithValue("@total", totalWordCount);
            cmd.Parameters.AddWithValue("@start", startDate);
            cmd.Parameters.AddWithValue("@end", endDate);
            cmd.Parameters.AddWithValue("@algo", algorithmType);
            cmd.Parameters.AddWithValue("@desc", string.IsNullOrWhiteSpace(description) ? (object)DBNull.Value : description);
            cmd.Parameters.AddWithValue("@priv", isPrivate);
            cmd.Parameters.AddWithValue("@startp", startingPoint);
            cmd.Parameters.AddWithValue("@meas", string.IsNullOrWhiteSpace(measurementUnit) ? (object)DBNull.Value : measurementUnit);
            cmd.Parameters.AddWithValue("@daily", isDailyTarget);
            cmd.Parameters.AddWithValue("@fixed", fixedDeadline);
            cmd.Parameters.AddWithValue("@target", string.IsNullOrWhiteSpace(targetFinishDate) ? (object)DBNull.Value : targetFinishDate);
            cmd.Parameters.AddWithValue("@strat", string.IsNullOrWhiteSpace(strategyIntensity) ? (object)DBNull.Value : strategyIntensity);
            cmd.Parameters.AddWithValue("@weekend", string.IsNullOrWhiteSpace(weekendApproach) ? (object)DBNull.Value : weekendApproach);
            cmd.Parameters.AddWithValue("@reserve", reserveDays);
            cmd.Parameters.AddWithValue("@view", displayViewType);
            cmd.Parameters.AddWithValue("@wstart", weekStartDay);
            cmd.Parameters.AddWithValue("@group", groupingType);
            cmd.Parameters.AddWithValue("@color", dashboardColor);
            cmd.Parameters.AddWithValue("@hist", showHistoricalData);
            cmd.Parameters.AddWithValue("@track", progressTrackingType);
            
            // Log the SQL for debugging
            Console.WriteLine($"Executing INSERT for plan: Title={title}, UserId={userId}, StartDate={startDate}, EndDate={endDate}");
            
            var result = cmd.ExecuteScalar();
            Console.WriteLine($"ExecuteScalar result: {result} (Type: {result?.GetType()})");
            
            if (result != null && result != DBNull.Value)
            {
                // Handle different numeric types returned by MySQL
                int planId = result switch
                {
                    long l => (int)l,
                    int i => i,
                    ulong ul => (int)ul, // MySQL LAST_INSERT_ID() returns UInt64
                    uint ui => (int)ui,
                    decimal d => (int)d,
                    double db => (int)db,
                    float f => (int)f,
                    _ => Convert.ToInt32(result) // Fallback conversion
                };
                
                Console.WriteLine($"Plan created successfully with ID: {planId}");
                return planId;
            }
            
            _lastError = "No ID returned from database insert - INSERT may have failed silently";
            Console.WriteLine("WARNING: INSERT executed but no ID returned");
            return -1;
        }
        catch (MySqlException ex)
        {
            // Capture MySQL-specific errors
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"MySQL Error creating plan:");
            Console.WriteLine($"  Error Number: {ex.Number}");
            Console.WriteLine($"  Error Message: {ex.Message}");
            Console.WriteLine($"  SQL State: {ex.SqlState}");
            if (ex.InnerException != null)
                Console.WriteLine($"  Inner Exception: {ex.InnerException.Message}");
            return -1;
        }
        catch (Exception ex)
        {
            // Capture general errors
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"Error creating plan: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
                Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
            return -1;
        }
    }

    /// <summary>
    /// Retrieves all plans for a user as JSON
    /// Returns empty array if no plans found
    /// </summary>
    public string GetPlansJson(int userId)
    {
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            
            // Get all plans for user, ordered by creation date (newest first)
            cmd.CommandText = "SELECT * FROM plans WHERE user_id=@u ORDER BY id DESC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var list = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var dict = new Dictionary<string, object>();
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    var val = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    
                    // Convert MySQL date types to strings for JSON serialization
                    if (val is DateTime dt)
                    {
                        dict[fieldName] = dt.ToString("yyyy-MM-dd");
                    }
                    else if (val is DateOnly dateOnly)
                    {
                        dict[fieldName] = dateOnly.ToString("yyyy-MM-dd");
                    }
                    else
                    {
                        dict[fieldName] = val ?? DBNull.Value;
                    }
                }
                list.Add(dict);
            }
            
            return JsonSerializer.Serialize(list);
        }
        catch
        {
            // Return empty array on error
            return "[]";
        }
    }

    public string? GetPlanJson(int id, int userId)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT * FROM plans WHERE id=@id AND user_id=@u LIMIT 1";
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@u", userId);
        using var reader = cmd.ExecuteReader();
        if (!reader.Read()) return null;
        var dict = new Dictionary<string, object>();
        for (var i = 0; i < reader.FieldCount; i++)
        {
            var val = reader.IsDBNull(i) ? null : reader.GetValue(i);
            dict[reader.GetName(i)] = val!;
        }
        return JsonSerializer.Serialize(dict);
    }

    public bool DeletePlan(int id, int userId)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM plans WHERE id=@id AND user_id=@u";
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@u", userId);
        return cmd.ExecuteNonQuery() == 1;
    }

    public int CreateChecklist(int userId, int? planId, string name)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT INTO checklists (user_id,plan_id,name) VALUES (@u,@p,@n); SELECT LAST_INSERT_ID();";
        cmd.Parameters.AddWithValue("@u", userId);
        cmd.Parameters.AddWithValue("@p", planId ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@n", name);
        var id = cmd.ExecuteScalar();
        return id is long l ? (int)l : -1;
    }

    public string GetChecklistsJson(int userId)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT * FROM checklists WHERE user_id=@u";
        cmd.Parameters.AddWithValue("@u", userId);
        using var reader = cmd.ExecuteReader();
        var list = new List<Dictionary<string, object>>();
        while (reader.Read())
        {
            var dict = new Dictionary<string, object>();
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var val = reader.IsDBNull(i) ? null : reader.GetValue(i);
                dict[reader.GetName(i)] = val!;
            }
            list.Add(dict);
        }
        return JsonSerializer.Serialize(list);
    }

    public bool DeleteChecklist(int id, int userId)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM checklists WHERE id=@id AND user_id=@u";
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@u", userId);
        return cmd.ExecuteNonQuery() == 1;
    }

    public bool AddChecklistItem(int checklistId, string content)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "INSERT INTO checklist_items (checklist_id,content) VALUES (@c,@x)";
        cmd.Parameters.AddWithValue("@c", checklistId);
        cmd.Parameters.AddWithValue("@x", content);
        return cmd.ExecuteNonQuery() == 1;
    }

    public int CreateChallenge(int userId, string title, string description, string type, int goalCount, int durationDays, string startDate)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT INTO challenges (user_id,title,description,type,goal_count,duration_days,start_date) VALUES (@u,@t,@d,@y,@g,@n,@s); SELECT LAST_INSERT_ID();";
        cmd.Parameters.AddWithValue("@u", userId);
        cmd.Parameters.AddWithValue("@t", title);
        cmd.Parameters.AddWithValue("@d", description);
        cmd.Parameters.AddWithValue("@y", type);
        cmd.Parameters.AddWithValue("@g", goalCount);
        cmd.Parameters.AddWithValue("@n", durationDays);
        cmd.Parameters.AddWithValue("@s", startDate);
        var id = cmd.ExecuteScalar();
        return id is long l ? (int)l : -1;
    }

    public string GetChallengesJson(int userId)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT * FROM challenges WHERE user_id=@u";
        cmd.Parameters.AddWithValue("@u", userId);
        using var reader = cmd.ExecuteReader();
        var list = new List<Dictionary<string, object>>();
        while (reader.Read())
        {
            var dict = new Dictionary<string, object>();
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var val = reader.IsDBNull(i) ? null : reader.GetValue(i);
                dict[reader.GetName(i)] = val!;
            }
            list.Add(dict);
        }
        return JsonSerializer.Serialize(list);
    }

    public string GetDashboardStatsJson(int userId)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM plans WHERE user_id=@u";
        cmd.Parameters.AddWithValue("@u", userId);
        var plans = Convert.ToInt32(cmd.ExecuteScalar());
        cmd.CommandText = "SELECT COUNT(*) FROM checklists WHERE user_id=@u";
        var checklists = Convert.ToInt32(cmd.ExecuteScalar());
        cmd.CommandText = @"SELECT COUNT(*) FROM checklist_items ci JOIN checklists c ON ci.checklist_id=c.id WHERE c.user_id=@u";
        var items = Convert.ToInt32(cmd.ExecuteScalar());
        var obj = new { plans, checklists, items };
        return JsonSerializer.Serialize(obj);
    }
}
