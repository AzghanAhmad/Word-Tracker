using MySqlConnector;
using System.Text.Json;

namespace WordTracker.Api.Services;

public class DbService : IDbService
{
    private readonly string _connectionString;
    public DbService(string connectionString)
    {
        _connectionString = connectionString;
    }

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

    public int CreatePlan(int userId, string title, int totalWordCount, string startDate, string endDate, string algorithmType, string? description, bool isPrivate, int startingPoint, string? measurementUnit, bool isDailyTarget, bool fixedDeadline, string? targetFinishDate, string? strategyIntensity, string? weekendApproach, int reserveDays, string displayViewType, string weekStartDay, string groupingType, string dashboardColor, bool showHistoricalData, string progressTrackingType)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT INTO plans
            (user_id,title,total_word_count,start_date,end_date,algorithm_type,description,is_private,starting_point,measurement_unit,is_daily_target,fixed_deadline,target_finish_date,strategy_intensity,weekend_approach,reserve_days,display_view_type,week_start_day,grouping_type,dashboard_color,show_historical_data,progress_tracking_type)
            VALUES (@user_id,@title,@total,@start,@end,@algo,@desc,@priv,@startp,@meas,@daily,@fixed,@target,@strat,@weekend,@reserve,@view,@wstart,@group,@color,@hist,@track);
            SELECT LAST_INSERT_ID();";
        cmd.Parameters.AddWithValue("@user_id", userId);
        cmd.Parameters.AddWithValue("@title", title);
        cmd.Parameters.AddWithValue("@total", totalWordCount);
        cmd.Parameters.AddWithValue("@start", startDate);
        cmd.Parameters.AddWithValue("@end", endDate);
        cmd.Parameters.AddWithValue("@algo", algorithmType);
        cmd.Parameters.AddWithValue("@desc", description ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@priv", isPrivate);
        cmd.Parameters.AddWithValue("@startp", startingPoint);
        cmd.Parameters.AddWithValue("@meas", measurementUnit ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@daily", isDailyTarget);
        cmd.Parameters.AddWithValue("@fixed", fixedDeadline);
        cmd.Parameters.AddWithValue("@target", targetFinishDate ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@strat", strategyIntensity ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@weekend", weekendApproach ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@reserve", reserveDays);
        cmd.Parameters.AddWithValue("@view", displayViewType);
        cmd.Parameters.AddWithValue("@wstart", weekStartDay);
        cmd.Parameters.AddWithValue("@group", groupingType);
        cmd.Parameters.AddWithValue("@color", dashboardColor);
        cmd.Parameters.AddWithValue("@hist", showHistoricalData);
        cmd.Parameters.AddWithValue("@track", progressTrackingType);
        var id = cmd.ExecuteScalar();
        return id is long l ? (int)l : -1;
    }

    public string GetPlansJson(int userId)
    {
        using var conn = new MySqlConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT * FROM plans WHERE user_id=@u";
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
