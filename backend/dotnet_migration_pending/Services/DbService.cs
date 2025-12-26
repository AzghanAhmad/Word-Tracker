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
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for CreateUser");
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "INSERT INTO users (username,email,password_hash) VALUES (@u,@e,@p)";
            cmd.Parameters.AddWithValue("@u", username);
            cmd.Parameters.AddWithValue("@e", email);
            cmd.Parameters.AddWithValue("@p", passwordHash);
            var result = cmd.ExecuteNonQuery() == 1;
            if (result)
                Console.WriteLine($"✓ User created: {username} ({email})");
            return result;
        }
        catch (MySqlException ex) when (ex.Number == 1062) // Duplicate entry
        {
            _lastError = $"User with email {email} or username {username} already exists";
            Console.WriteLine($"✗ Duplicate user: {ex.Message}");
            return false;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in CreateUser: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in CreateUser: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return false;
        }
    }

    public (int id, string username, string passwordHash)? GetUserByEmail(string email)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for GetUserByEmail");
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id,username,password_hash FROM users WHERE email=@e LIMIT 1";
            cmd.Parameters.AddWithValue("@e", email);
            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                var user = (reader.GetInt32(0), reader.GetString(1), reader.GetString(2));
                Console.WriteLine($"✓ User found: {user.Item2} (ID: {user.Item1})");
                return user;
            }
            Console.WriteLine($"✗ User not found with email: {email}");
            return null;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in GetUserByEmail: {ex.Number} - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in GetUserByEmail: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return null;
        }
    }

    public (int id, string username, string passwordHash)? GetUserById(int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for GetUserById");
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id,username,password_hash FROM users WHERE id=@id LIMIT 1";
            cmd.Parameters.AddWithValue("@id", userId);
            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                var user = (reader.GetInt32(0), reader.GetString(1), reader.GetString(2));
                Console.WriteLine($"✓ User found: {user.Item2} (ID: {user.Item1})");
                return user;
            }
            Console.WriteLine($"✗ User not found with ID: {userId}");
            return null;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in GetUserById: {ex.Number} - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in GetUserById: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return null;
        }
    }

    /// <summary>
    /// Creates a new writing plan for a user
    /// Returns the ID of the created plan, or -1 if creation failed
    /// </summary>
    public int CreatePlan(int userId, string title, int totalWordCount, string startDate, string endDate, string algorithmType, string? description, bool isPrivate, int startingPoint, string? measurementUnit, bool isDailyTarget, bool fixedDeadline, string? targetFinishDate, string? strategyIntensity, string? weekendApproach, int reserveDays, string displayViewType, string weekStartDay, string groupingType, string dashboardColor, bool showHistoricalData, string progressTrackingType, string? activityType, string? contentType)
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
                (user_id,title,total_word_count,start_date,end_date,algorithm_type,description,is_private,starting_point,measurement_unit,is_daily_target,fixed_deadline,target_finish_date,strategy_intensity,weekend_approach,reserve_days,display_view_type,week_start_day,grouping_type,dashboard_color,show_historical_data,progress_tracking_type,activity_type,content_type)
                VALUES (@user_id,@title,@total,@start,@end,@algo,@desc,@priv,@startp,@meas,@daily,@fixed,@target,@strat,@weekend,@reserve,@view,@wstart,@group,@color,@hist,@track,@activity,@content);
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
            cmd.Parameters.AddWithValue("@activity", string.IsNullOrWhiteSpace(activityType) ? "Writing" : activityType);
            cmd.Parameters.AddWithValue("@content", string.IsNullOrWhiteSpace(contentType) ? "Novel" : contentType);
            
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

    public bool UpdatePlan(int planId, int userId, string title, int totalWordCount, string startDate, string endDate, string algorithmType, string? description, bool isPrivate, int startingPoint, string? measurementUnit, bool isDailyTarget, bool fixedDeadline, string? targetFinishDate, string? strategyIntensity, string? weekendApproach, int reserveDays, string displayViewType, string weekStartDay, string groupingType, string dashboardColor, bool showHistoricalData, string progressTrackingType, string? activityType, string? contentType)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔄 Updating plan {planId} for user {userId}: Title={title}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Verify plan exists and belongs to user
            using (var checkCmd = conn.CreateCommand())
            {
                checkCmd.CommandText = "SELECT COUNT(*) FROM plans WHERE id=@pid AND user_id=@uid";
                checkCmd.Parameters.AddWithValue("@pid", planId);
                checkCmd.Parameters.AddWithValue("@uid", userId);
                var planExists = Convert.ToInt32(checkCmd.ExecuteScalar()) > 0;
                if (!planExists)
                {
                    _lastError = $"Plan with ID {planId} not found or doesn't belong to user {userId}";
                    Console.WriteLine($"✗ Plan {planId} not found or access denied for user {userId}");
                    return false;
                }
            }
            
            using var cmd = conn.CreateCommand();
            
            // Update plan with all configuration options
            cmd.CommandText = @"UPDATE plans SET
                title=@title,
                total_word_count=@total,
                start_date=@start,
                end_date=@end,
                algorithm_type=@algo,
                description=@desc,
                is_private=@priv,
                starting_point=@startp,
                measurement_unit=@meas,
                is_daily_target=@daily,
                fixed_deadline=@fixed,
                target_finish_date=@target,
                strategy_intensity=@strat,
                weekend_approach=@weekend,
                reserve_days=@reserve,
                display_view_type=@view,
                week_start_day=@wstart,
                grouping_type=@group,
                dashboard_color=@color,
                show_historical_data=@hist,
                progress_tracking_type=@track,
                activity_type=@activity,
                content_type=@content
                WHERE id=@pid AND user_id=@uid";
            
            // Set parameters with proper null handling
            cmd.Parameters.AddWithValue("@pid", planId);
            cmd.Parameters.AddWithValue("@uid", userId);
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
            cmd.Parameters.AddWithValue("@activity", string.IsNullOrWhiteSpace(activityType) ? "Writing" : activityType);
            cmd.Parameters.AddWithValue("@content", string.IsNullOrWhiteSpace(contentType) ? "Novel" : contentType);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            
            if (rowsAffected > 0)
            {
                Console.WriteLine($"✓ Plan {planId} updated successfully");
                return true;
            }
            
            _lastError = "Update executed but no rows were affected";
            Console.WriteLine($"✗ Update failed: No rows affected for plan {planId}");
            return false;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error updating plan: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error updating plan: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return false;
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

    public string GetPlanDaysJson(int planId, int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📅 Fetching plan days for plan {planId}, user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // First verify the plan belongs to the user
            using var verifyCmd = conn.CreateCommand();
            verifyCmd.CommandText = "SELECT id FROM plans WHERE id=@pid AND user_id=@uid LIMIT 1";
            verifyCmd.Parameters.AddWithValue("@pid", planId);
            verifyCmd.Parameters.AddWithValue("@uid", userId);
            
            if (verifyCmd.ExecuteScalar() == null)
            {
                Console.WriteLine($"✗ Plan {planId} not found or doesn't belong to user {userId}");
                return "[]";
            }
            
            // Get plan days
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT date, target_count, actual_count, notes
                FROM plan_days
                WHERE plan_id = @pid
                ORDER BY date DESC";
            cmd.Parameters.AddWithValue("@pid", planId);
            
            using var reader = cmd.ExecuteReader();
            var days = new List<Dictionary<string, object>>();
            
            // Get column indices
            var dateOrdinal = reader.GetOrdinal("date");
            var targetCountOrdinal = reader.GetOrdinal("target_count");
            var actualCountOrdinal = reader.GetOrdinal("actual_count");
            var notesOrdinal = reader.GetOrdinal("notes");
            
            while (reader.Read())
            {
                var day = new Dictionary<string, object>
                {
                    ["date"] = reader.GetDateTime(dateOrdinal).ToString("yyyy-MM-dd"),
                    ["target_count"] = reader.IsDBNull(targetCountOrdinal) ? 0 : reader.GetInt32(targetCountOrdinal),
                    ["actual_count"] = reader.IsDBNull(actualCountOrdinal) ? 0 : reader.GetInt32(actualCountOrdinal),
                    ["notes"] = reader.IsDBNull(notesOrdinal) ? null : reader.GetString(notesOrdinal)
                };
                days.Add(day);
            }
            
            Console.WriteLine($"✓ Retrieved {days.Count} plan days for plan {planId}");
            return JsonSerializer.Serialize(days);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching plan days: {ex.Number} - {ex.Message}");
            return "[]";
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching plan days: {ex.Message}");
            return "[]";
        }
    }

    public int CreateChecklist(int userId, int? planId, string name)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"INSERT INTO checklists (user_id,plan_id,name) VALUES (@u,@p,@n); SELECT LAST_INSERT_ID();";
            cmd.Parameters.AddWithValue("@u", userId);
            cmd.Parameters.AddWithValue("@p", planId ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@n", name);
            var id = cmd.ExecuteScalar();
            return id is long l ? (int)l : (id is int i ? i : -1);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error creating checklist: {ex.Number} - {ex.Message}");
            return -1;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error creating checklist: {ex.Message}");
            return -1;
        }
    }

    public int CreateChecklistWithItems(int userId, int? planId, string name, System.Text.Json.JsonElement[]? items)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔌 Connecting to database for CreateChecklistWithItems");
            Console.WriteLine($"   User ID: {userId}, Plan ID: {planId}, Name: {name}, Items: {items?.Length ?? 0}");
            
            if (string.IsNullOrEmpty(_connectionString))
            {
                _lastError = "Database connection string is not configured";
                Console.WriteLine("✗ Connection string is empty");
                return -1;
            }
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection opened");
            
            // Start transaction
            using var transaction = conn.BeginTransaction();
            Console.WriteLine($"✓ Transaction started");
            
            try
            {
                // Create checklist
                using var cmd = conn.CreateCommand();
                cmd.Transaction = transaction;
                cmd.CommandText = @"INSERT INTO checklists (user_id,plan_id,name) VALUES (@u,@p,@n); SELECT LAST_INSERT_ID();";
                cmd.Parameters.AddWithValue("@u", userId);
                cmd.Parameters.AddWithValue("@p", planId ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@n", name);
                
                Console.WriteLine($"   Executing INSERT INTO checklists...");
                var idResult = cmd.ExecuteScalar();
                Console.WriteLine($"   ExecuteScalar result: {idResult} (Type: {idResult?.GetType()})");
                
                var checklistId = idResult is long l ? (int)l : (idResult is int i ? i : (idResult is ulong ul ? (int)ul : -1));
                
                if (checklistId <= 0)
                {
                    transaction.Rollback();
                    _lastError = "Failed to create checklist - no ID returned";
                    Console.WriteLine($"✗ No valid ID returned from INSERT");
                    return -1;
                }
                
                Console.WriteLine($"✓ Checklist created with ID: {checklistId}");
                
                // Add items if provided
                if (items != null && items.Length > 0)
                {
                    int sortOrder = 0;
                    int itemsAdded = 0;
                    foreach (var item in items)
                    {
                        // Extract text/content from JsonElement
                        string? content = null;
                        if (item.TryGetProperty("text", out var textProp))
                        {
                            content = textProp.GetString();
                        }
                        else if (item.TryGetProperty("content", out var contentProp))
                        {
                            content = contentProp.GetString();
                        }
                        
                        if (!string.IsNullOrWhiteSpace(content))
                        {
                            using var itemCmd = conn.CreateCommand();
                            itemCmd.Transaction = transaction;
                            itemCmd.CommandText = @"INSERT INTO checklist_items (checklist_id,content,sort_order) VALUES (@c,@x,@s)";
                            itemCmd.Parameters.AddWithValue("@c", checklistId);
                            itemCmd.Parameters.AddWithValue("@x", content);
                            itemCmd.Parameters.AddWithValue("@s", sortOrder++);
                            itemCmd.ExecuteNonQuery();
                            itemsAdded++;
                        }
                    }
                    Console.WriteLine($"✓ Added {itemsAdded} items to checklist {checklistId}");
                }
                
                transaction.Commit();
                Console.WriteLine($"✓ Transaction committed successfully");
                return checklistId;
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                Console.WriteLine($"✗ Transaction rolled back due to error: {ex.Message}");
                throw;
            }
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error creating checklist with items:");
            Console.WriteLine($"   Error Number: {ex.Number}");
            Console.WriteLine($"   Error Message: {ex.Message}");
            Console.WriteLine($"   SQL State: {ex.SqlState}");
            if (ex.InnerException != null)
                Console.WriteLine($"   Inner Exception: {ex.InnerException.Message}");
            return -1;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error creating checklist with items: {ex.Message}");
            Console.WriteLine($"   Type: {ex.GetType().Name}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
                Console.WriteLine($"   Inner Exception: {ex.InnerException.Message}");
            return -1;
        }
    }

    public string GetChecklistsJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"SELECT c.*, 
                (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id) as item_count,
                (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id AND is_done = 1) as completed_count
                FROM checklists c 
                WHERE c.user_id = @u 
                ORDER BY c.created_at DESC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var checklists = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var checklist = new Dictionary<string, object>();
                var checklistId = reader.GetInt32("id");
                
                // Add checklist fields
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    
                    if (reader.IsDBNull(i))
                    {
                        // Explicitly set to null (not DBNull.Value) for proper JSON serialization
                        checklist[fieldName] = null!;
                        continue;
                    }
                    
                    var val = reader.GetValue(i);
                    
                    // Convert dates to strings
                    if (val is DateTime dt)
                    {
                        checklist[fieldName] = dt.ToString("yyyy-MM-ddTHH:mm:ss");
                    }
                    else if (val is DateOnly dateOnly)
                    {
                        checklist[fieldName] = dateOnly.ToString("yyyy-MM-dd");
                    }
                    else
                    {
                        checklist[fieldName] = val;
                    }
                }
                
                // Fetch items for this checklist
                using var itemsConn = new MySqlConnection(_connectionString);
                itemsConn.Open();
                using var itemsCmd = itemsConn.CreateCommand();
                itemsCmd.CommandText = @"SELECT id, content, is_done, sort_order 
                    FROM checklist_items 
                    WHERE checklist_id = @cid 
                    ORDER BY sort_order ASC, id ASC";
                itemsCmd.Parameters.AddWithValue("@cid", checklistId);
                
                using var itemsReader = itemsCmd.ExecuteReader();
                var items = new List<Dictionary<string, object>>();
                
                while (itemsReader.Read())
                {
                    var item = new Dictionary<string, object>
                    {
                        ["id"] = itemsReader.GetInt32("id"),
                        ["text"] = itemsReader.GetString("content"),
                        ["content"] = itemsReader.GetString("content"), // Keep both for compatibility
                        ["is_done"] = itemsReader.GetBoolean("is_done"),
                        ["is_completed"] = itemsReader.GetBoolean("is_done"), // Alias for frontend
                        ["sort_order"] = itemsReader.GetInt32("sort_order")
                    };
                    items.Add(item);
                }
                
                checklist["items"] = items;
                checklists.Add(checklist);
            }
            
            Console.WriteLine($"✓ Retrieved {checklists.Count} checklists with items for user {userId}");
            return JsonSerializer.Serialize(checklists);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching checklists: {ex.Number} - {ex.Message}");
            return "[]";
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching checklists: {ex.Message}");
            return "[]";
        }
    }

    public string? GetChecklistJson(int id, int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔍 Fetching checklist {id} for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"SELECT c.*, 
                (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id) as item_count,
                (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id AND is_done = 1) as completed_count
                FROM checklists c 
                WHERE c.id = @id AND c.user_id = @u";
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            
            if (!reader.Read())
            {
                Console.WriteLine($"✗ Checklist {id} not found for user {userId}");
                return null;
            }
            
            var checklist = new Dictionary<string, object>();
            var checklistId = reader.GetInt32("id");
            
            // Add checklist fields
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var fieldName = reader.GetName(i);
                
                if (reader.IsDBNull(i))
                {
                    // Don't add null values to avoid serialization issues
                    // Or explicitly set to null (not DBNull.Value)
                    checklist[fieldName] = null!;
                    continue;
                }
                
                var val = reader.GetValue(i);
                
                // Convert dates to strings
                if (val is DateTime dt)
                {
                    checklist[fieldName] = dt.ToString("yyyy-MM-ddTHH:mm:ss");
                }
                else if (val is DateOnly dateOnly)
                {
                    checklist[fieldName] = dateOnly.ToString("yyyy-MM-dd");
                }
                else
                {
                    checklist[fieldName] = val;
                }
            }
            
            // Fetch items for this checklist
            using var itemsConn = new MySqlConnection(_connectionString);
            itemsConn.Open();
            using var itemsCmd = itemsConn.CreateCommand();
            itemsCmd.CommandText = @"SELECT id, content, is_done, sort_order 
                FROM checklist_items 
                WHERE checklist_id = @cid 
                ORDER BY sort_order ASC, id ASC";
            itemsCmd.Parameters.AddWithValue("@cid", checklistId);
            
            using var itemsReader = itemsCmd.ExecuteReader();
            var items = new List<Dictionary<string, object>>();
            
            while (itemsReader.Read())
            {
                var item = new Dictionary<string, object>
                {
                    ["id"] = itemsReader.GetInt32("id"),
                    ["text"] = itemsReader.GetString("content"),
                    ["content"] = itemsReader.GetString("content"),
                    ["is_done"] = itemsReader.GetBoolean("is_done"),
                    ["is_completed"] = itemsReader.GetBoolean("is_done"),
                    ["sort_order"] = itemsReader.GetInt32("sort_order")
                };
                items.Add(item);
            }
            
            checklist["items"] = items;
            
            Console.WriteLine($"✓ Retrieved checklist {id} with {items.Count} items");
            return JsonSerializer.Serialize(checklist);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching checklist: {ex.Number} - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching checklist: {ex.Message}");
            return null;
        }
    }

    public bool UpdateChecklist(int id, int userId, string name, System.Text.Json.JsonElement[]? items)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔌 Updating checklist {id} for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var transaction = conn.BeginTransaction();
            
            try
            {
                // Update checklist name
                using var cmd = conn.CreateCommand();
                cmd.Transaction = transaction;
                cmd.CommandText = "UPDATE checklists SET name=@n WHERE id=@id AND user_id=@u";
                cmd.Parameters.AddWithValue("@n", name);
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@u", userId);
                
                var rowsAffected = cmd.ExecuteNonQuery();
                if (rowsAffected != 1)
                {
                    transaction.Rollback();
                    _lastError = "Checklist not found or you don't have permission to update it";
                    Console.WriteLine($"✗ Checklist {id} not found or permission denied");
                    return false;
                }
                
                Console.WriteLine($"✓ Updated checklist {id} name");
                
                // Delete existing items
                using var deleteCmd = conn.CreateCommand();
                deleteCmd.Transaction = transaction;
                deleteCmd.CommandText = "DELETE FROM checklist_items WHERE checklist_id=@id";
                deleteCmd.Parameters.AddWithValue("@id", id);
                deleteCmd.ExecuteNonQuery();
                Console.WriteLine($"✓ Deleted existing items for checklist {id}");
                
                // Add new items
                if (items != null && items.Length > 0)
                {
                    int sortOrder = 0;
                    foreach (var item in items)
                    {
                        string? content = null;
                        if (item.TryGetProperty("text", out var textProp))
                        {
                            content = textProp.GetString();
                        }
                        else if (item.TryGetProperty("content", out var contentProp))
                        {
                            content = contentProp.GetString();
                        }
                        
                        if (!string.IsNullOrWhiteSpace(content))
                        {
                            using var itemCmd = conn.CreateCommand();
                            itemCmd.Transaction = transaction;
                            itemCmd.CommandText = @"INSERT INTO checklist_items (checklist_id,content,sort_order) VALUES (@c,@x,@s)";
                            itemCmd.Parameters.AddWithValue("@c", id);
                            itemCmd.Parameters.AddWithValue("@x", content);
                            itemCmd.Parameters.AddWithValue("@s", sortOrder++);
                            itemCmd.ExecuteNonQuery();
                        }
                    }
                    Console.WriteLine($"✓ Added {items.Length} items to checklist {id}");
                }
                
                transaction.Commit();
                Console.WriteLine($"✓ Checklist {id} updated successfully");
                return true;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error updating checklist: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error updating checklist: {ex.Message}");
            return false;
        }
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
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "INSERT INTO checklist_items (checklist_id,content) VALUES (@c,@x)";
            cmd.Parameters.AddWithValue("@c", checklistId);
            cmd.Parameters.AddWithValue("@x", content);
            var result = cmd.ExecuteNonQuery() == 1;
            if (result)
                Console.WriteLine($"✓ Added item to checklist {checklistId}");
            return result;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error adding checklist item: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error adding checklist item: {ex.Message}");
            return false;
        }
    }

    public bool UpdateChecklistItem(int itemId, bool isDone)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔌 Updating checklist item {itemId}: is_done = {isDone}");
            
            if (string.IsNullOrEmpty(_connectionString))
            {
                _lastError = "Database connection string is not configured";
                Console.WriteLine("✗ Connection string is empty");
                return false;
            }
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection opened");
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE checklist_items SET is_done=@d WHERE id=@id";
            cmd.Parameters.AddWithValue("@d", isDone);
            cmd.Parameters.AddWithValue("@id", itemId);
            
            Console.WriteLine($"   Executing UPDATE checklist_items SET is_done={isDone} WHERE id={itemId}");
            var rowsAffected = cmd.ExecuteNonQuery();
            var result = rowsAffected == 1;
            
            if (result)
            {
                Console.WriteLine($"✓ Updated checklist item {itemId} to is_done={isDone}");
            }
            else
            {
                _lastError = $"No rows affected. Item {itemId} may not exist.";
                Console.WriteLine($"✗ No rows affected. Item {itemId} may not exist.");
            }
            
            return result;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error updating checklist item:");
            Console.WriteLine($"   Error Number: {ex.Number}");
            Console.WriteLine($"   Error Message: {ex.Message}");
            Console.WriteLine($"   SQL State: {ex.SqlState}");
            if (ex.InnerException != null)
                Console.WriteLine($"   Inner Exception: {ex.InnerException.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error updating checklist item: {ex.Message}");
            Console.WriteLine($"   Type: {ex.GetType().Name}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
                Console.WriteLine($"   Inner Exception: {ex.InnerException.Message}");
            return false;
        }
    }

    public int CreateChallenge(int userId, string title, string description, string type, int goalCount, string startDate, string endDate, bool isPublic)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🏆 Creating challenge: {title} for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Generate a random invite code
            var inviteCode = Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper();
            
            // Calculate duration days
            var start = DateTime.Parse(startDate);
            var end = DateTime.Parse(endDate);
            var durationDays = (int)(end - start).TotalDays;
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"INSERT INTO challenges (user_id,title,description,type,goal_count,duration_days,start_date,end_date,is_public,invite_code) 
                VALUES (@u,@t,@d,@y,@g,@n,@s,@e,@p,@i); SELECT LAST_INSERT_ID();";
            cmd.Parameters.AddWithValue("@u", userId);
            cmd.Parameters.AddWithValue("@t", title);
            cmd.Parameters.AddWithValue("@d", description);
            cmd.Parameters.AddWithValue("@y", type);
            cmd.Parameters.AddWithValue("@g", goalCount);
            cmd.Parameters.AddWithValue("@n", durationDays);
            cmd.Parameters.AddWithValue("@s", startDate);
            cmd.Parameters.AddWithValue("@e", endDate);
            cmd.Parameters.AddWithValue("@p", isPublic);
            cmd.Parameters.AddWithValue("@i", inviteCode);
            
            var id = cmd.ExecuteScalar();
            var challengeId = id is ulong ul ? (int)ul : (id is long l ? (int)l : -1);
            
            if (challengeId > 0)
            {
                // Auto-join the creator to the challenge
                JoinChallenge(challengeId, userId);
                Console.WriteLine($"✓ Challenge created with ID: {challengeId}, invite code: {inviteCode}");
            }
            
            return challengeId;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error creating challenge: {ex.Number} - {ex.Message}");
            return -1;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error creating challenge: {ex.Message}");
            return -1;
        }
    }

    public string GetChallengesJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📋 Fetching challenges for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Get challenges the user has joined
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT c.*, 
                    (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participants,
                    (SELECT current_progress FROM challenge_participants WHERE challenge_id = c.id AND user_id = @u) as my_progress,
                    1 as is_joined
                FROM challenges c
                INNER JOIN challenge_participants cp ON c.id = cp.challenge_id
                WHERE cp.user_id = @u
                ORDER BY c.created_at DESC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var list = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var dict = new Dictionary<string, object>();
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    if (reader.IsDBNull(i))
                    {
                        dict[fieldName] = null!;
                    }
                    else
                    {
                        var val = reader.GetValue(i);
                        if (val is DateTime dt)
                        {
                            dict[fieldName] = dt.ToString("yyyy-MM-dd");
                        }
                        else
                        {
                            dict[fieldName] = val;
                        }
                    }
                }
                // Map fields for frontend compatibility
                dict["name"] = dict["title"];
                dict["goal_amount"] = dict["goal_count"];
                list.Add(dict);
            }
            
            Console.WriteLine($"✓ Retrieved {list.Count} joined challenges for user {userId}");
            return JsonSerializer.Serialize(list);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching challenges: {ex.Number} - {ex.Message}");
            return "[]";
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching challenges: {ex.Message}");
            return "[]";
        }
    }

    public string GetAllPublicChallengesJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🌍 Fetching all public challenges");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT c.*, 
                    (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participants,
                    (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id AND user_id = @u) as is_joined
                FROM challenges c
                WHERE c.is_public = 1 AND c.status = 'Active'
                ORDER BY c.created_at DESC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var list = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var dict = new Dictionary<string, object>();
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    if (reader.IsDBNull(i))
                    {
                        dict[fieldName] = null!;
                    }
                    else
                    {
                        var val = reader.GetValue(i);
                        if (val is DateTime dt)
                        {
                            dict[fieldName] = dt.ToString("yyyy-MM-dd");
                        }
                        else
                        {
                            dict[fieldName] = val;
                        }
                    }
                }
                // Map fields for frontend compatibility
                dict["name"] = dict["title"];
                dict["goal_amount"] = dict["goal_count"];
                list.Add(dict);
            }
            
            Console.WriteLine($"✓ Retrieved {list.Count} public challenges");
            return JsonSerializer.Serialize(list);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching public challenges: {ex.Number} - {ex.Message}");
            return "[]";
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching public challenges: {ex.Message}");
            return "[]";
        }
    }

    public string? GetChallengeJson(int id, int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔍 Fetching challenge {id}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT c.*, 
                    (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participants,
                    (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id AND user_id = @u) as is_joined,
                    (SELECT current_progress FROM challenge_participants WHERE challenge_id = c.id AND user_id = @u) as my_progress
                FROM challenges c
                WHERE c.id = @id";
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            
            if (!reader.Read())
            {
                Console.WriteLine($"✗ Challenge {id} not found");
                return null;
            }
            
            var dict = new Dictionary<string, object>();
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var fieldName = reader.GetName(i);
                if (reader.IsDBNull(i))
                {
                    dict[fieldName] = null!;
                }
                else
                {
                    var val = reader.GetValue(i);
                    if (val is DateTime dt)
                    {
                        dict[fieldName] = dt.ToString("yyyy-MM-dd");
                    }
                    else
                    {
                        dict[fieldName] = val;
                    }
                }
            }
            
            // Map fields for frontend compatibility
            dict["name"] = dict["title"];
            dict["goal_amount"] = dict["goal_count"];
            
            reader.Close();
            
            // Get participants with their progress
            using var participantsCmd = conn.CreateCommand();
            participantsCmd.CommandText = @"
                SELECT cp.user_id, u.username, cp.current_progress, cp.joined_at
                FROM challenge_participants cp
                INNER JOIN users u ON cp.user_id = u.id
                WHERE cp.challenge_id = @id
                ORDER BY cp.current_progress DESC";
            participantsCmd.Parameters.AddWithValue("@id", id);
            
            using var pReader = participantsCmd.ExecuteReader();
            var participantsList = new List<Dictionary<string, object>>();
            
            while (pReader.Read())
            {
                var p = new Dictionary<string, object>
                {
                    ["user_id"] = pReader.GetInt32("user_id"),
                    ["username"] = pReader.GetString("username"),
                    ["current_progress"] = pReader.GetInt32("current_progress"),
                    ["joined_at"] = pReader.GetDateTime("joined_at").ToString("yyyy-MM-dd")
                };
                participantsList.Add(p);
            }
            
            dict["participants_list"] = participantsList;
            
            Console.WriteLine($"✓ Retrieved challenge {id} with {participantsList.Count} participants");
            return JsonSerializer.Serialize(dict);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching challenge: {ex.Number} - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching challenge: {ex.Message}");
            return null;
        }
    }

    public bool JoinChallenge(int challengeId, int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"👤 User {userId} joining challenge {challengeId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "INSERT IGNORE INTO challenge_participants (challenge_id, user_id, current_progress) VALUES (@c, @u, 0)";
            cmd.Parameters.AddWithValue("@c", challengeId);
            cmd.Parameters.AddWithValue("@u", userId);
            
            var result = cmd.ExecuteNonQuery();
            Console.WriteLine($"✓ User {userId} joined challenge {challengeId}");
            return true;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error joining challenge: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error joining challenge: {ex.Message}");
            return false;
        }
    }

    public int? GetChallengeIdByInviteCode(string inviteCode)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔍 Looking up challenge by invite code: {inviteCode}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id FROM challenges WHERE invite_code = @code AND status = 'Active' LIMIT 1";
            cmd.Parameters.AddWithValue("@code", inviteCode.Trim().ToUpper());
            
            var result = cmd.ExecuteScalar();
            
            if (result != null && result != DBNull.Value)
            {
                var challengeId = result is ulong ul ? (int)ul : (result is long l ? (int)l : Convert.ToInt32(result));
                Console.WriteLine($"✓ Found challenge {challengeId} with invite code {inviteCode}");
                return challengeId;
            }
            
            Console.WriteLine($"✗ No active challenge found with invite code {inviteCode}");
            return null;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error looking up invite code: {ex.Number} - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error looking up invite code: {ex.Message}");
            return null;
        }
    }

    public bool LeaveChallenge(int challengeId, int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"👤 User {userId} leaving challenge {challengeId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM challenge_participants WHERE challenge_id = @c AND user_id = @u";
            cmd.Parameters.AddWithValue("@c", challengeId);
            cmd.Parameters.AddWithValue("@u", userId);
            
            var result = cmd.ExecuteNonQuery();
            Console.WriteLine($"✓ User {userId} left challenge {challengeId}");
            return result == 1;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error leaving challenge: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error leaving challenge: {ex.Message}");
            return false;
        }
    }

    public bool UpdateChallengeProgress(int challengeId, int userId, int progress)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📊 Updating progress for user {userId} in challenge {challengeId}: {progress}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE challenge_participants SET current_progress = @p WHERE challenge_id = @c AND user_id = @u";
            cmd.Parameters.AddWithValue("@p", progress);
            cmd.Parameters.AddWithValue("@c", challengeId);
            cmd.Parameters.AddWithValue("@u", userId);
            
            var result = cmd.ExecuteNonQuery();
            Console.WriteLine($"✓ Progress updated for user {userId} in challenge {challengeId}");
            return result == 1;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error updating progress: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error updating progress: {ex.Message}");
            return false;
        }
    }

    public bool DeleteChallenge(int id, int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🗑️ Deleting challenge {id} (owner: user {userId})");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM challenges WHERE id = @id AND user_id = @u";
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@u", userId);
            
            var result = cmd.ExecuteNonQuery();
            
            if (result == 1)
            {
                Console.WriteLine($"✓ Challenge {id} deleted");
                return true;
            }
            else
            {
                _lastError = "Challenge not found or you don't have permission to delete it";
                Console.WriteLine($"✗ Challenge {id} not deleted (not found or not owner)");
                return false;
            }
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error deleting challenge: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error deleting challenge: {ex.Message}");
            return false;
        }
    }

    public string GetDashboardStatsJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for GetDashboardStatsJson (userId: {userId})");
            
            using var cmd = conn.CreateCommand();
            cmd.Parameters.AddWithValue("@u", userId);
            
            // Total Plans - count all plans for the user
            cmd.CommandText = "SELECT COUNT(*) FROM plans WHERE user_id=@u";
            var totalPlans = Convert.ToInt32(cmd.ExecuteScalar());
            
            // Active Plans - count plans with status='active'
            cmd.CommandText = "SELECT COUNT(*) FROM plans WHERE user_id=@u AND status='active'";
            var activePlans = Convert.ToInt32(cmd.ExecuteScalar());
            
            // Total Words - sum of total_word_count from all plans
            cmd.CommandText = "SELECT COALESCE(SUM(total_word_count), 0) FROM plans WHERE user_id=@u";
            var totalWords = Convert.ToInt64(cmd.ExecuteScalar());
            
            // Completed Plans - count plans with status='completed'
            cmd.CommandText = "SELECT COUNT(*) FROM plans WHERE user_id=@u AND status='completed'";
            var completedPlans = Convert.ToInt32(cmd.ExecuteScalar());
            
            var obj = new 
            { 
                totalPlans, 
                activePlans, 
                totalWords, 
                completedPlans 
            };
            
            Console.WriteLine($"✓ Dashboard stats calculated: Total={totalPlans}, Active={activePlans}, Words={totalWords}, Completed={completedPlans}");
            return JsonSerializer.Serialize(obj);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in GetDashboardStatsJson: {ex.Number} - {ex.Message}");
            // Return default stats on error
            var defaultObj = new { totalPlans = 0, activePlans = 0, totalWords = 0, completedPlans = 0 };
            return JsonSerializer.Serialize(defaultObj);
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in GetDashboardStatsJson: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            // Return default stats on error
            var defaultObj = new { totalPlans = 0, activePlans = 0, totalWords = 0, completedPlans = 0 };
            return JsonSerializer.Serialize(defaultObj);
        }
    }

    /// <summary>
    /// Gets all public plans from all users (for community page)
    /// Excludes the requesting user's own plans
    /// </summary>
    public string GetPublicPlansJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🌐 Fetching public plans for community (excluding user {userId})");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            // Get public plans from other users with progress calculation
            cmd.CommandText = @"
                SELECT 
                    p.id,
                    p.title,
                    p.total_word_count as goal_amount,
                    COALESCE(p.measurement_unit, 'words') as goal_unit,
                    p.start_date,
                    p.end_date,
                    p.status,
                    COALESCE(p.activity_type, 'Writing') as activity_type,
                    COALESCE(p.content_type, 'Novel') as content_type,
                    p.description,
                    u.username as creator_username,
                    COALESCE(
                        (SELECT SUM(actual_count) FROM plan_days WHERE plan_id = p.id), 
                        0
                    ) as total_progress,
                    CASE 
                        WHEN p.total_word_count > 0 THEN 
                            ROUND((COALESCE((SELECT SUM(actual_count) FROM plan_days WHERE plan_id = p.id), 0) / p.total_word_count) * 100, 1)
                        ELSE 0 
                    END as progress_percent
                FROM plans p
                INNER JOIN users u ON p.user_id = u.id
                WHERE p.is_private = 0 
                    AND p.user_id != @u
                    AND p.status = 'active'
                ORDER BY p.id DESC
                LIMIT 50";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var plans = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var planId = reader.GetInt32("id");
                
                var plan = new Dictionary<string, object>
                {
                    ["id"] = planId,
                    ["title"] = reader.GetString("title"),
                    ["goal_amount"] = reader.GetInt32("goal_amount"),
                    ["goal_unit"] = reader.GetString("goal_unit"),
                    ["start_date"] = reader.IsDBNull(reader.GetOrdinal("start_date")) ? null! : reader.GetDateTime("start_date").ToString("yyyy-MM-dd"),
                    ["end_date"] = reader.IsDBNull(reader.GetOrdinal("end_date")) ? null! : reader.GetDateTime("end_date").ToString("yyyy-MM-dd"),
                    ["status"] = reader.GetString("status"),
                    ["activity_type"] = reader.GetString("activity_type"),
                    ["content_type"] = reader.GetString("content_type"),
                    ["description"] = reader.IsDBNull(reader.GetOrdinal("description")) ? "" : reader.GetString("description"),
                    ["creator_username"] = reader.GetString("creator_username"),
                    ["total_progress"] = Convert.ToInt64(reader["total_progress"]),
                    ["progress_percent"] = Convert.ToDouble(reader["progress_percent"]),
                    ["graph_data"] = new List<int>() // Will be filled below
                };
                
                plans.Add(plan);
            }
            
            reader.Close();
            
            // Get graph data (last 14 days of actual_count) for each plan
            foreach (var plan in plans)
            {
                var planId = (int)plan["id"];
                using var graphCmd = conn.CreateCommand();
                graphCmd.CommandText = @"
                    SELECT COALESCE(actual_count, 0) as count
                    FROM plan_days 
                    WHERE plan_id = @pid 
                    ORDER BY date DESC 
                    LIMIT 14";
                graphCmd.Parameters.AddWithValue("@pid", planId);
                
                using var graphReader = graphCmd.ExecuteReader();
                var graphData = new List<int>();
                
                while (graphReader.Read())
                {
                    graphData.Add(graphReader.GetInt32("count"));
                }
                
                // Reverse to show oldest first
                graphData.Reverse();
                
                // If no data, add some placeholder data
                if (graphData.Count == 0)
                {
                    graphData = new List<int> { 0, 0, 0, 0, 0 };
                }
                
                plan["graph_data"] = graphData;
            }
            
            Console.WriteLine($"✓ Retrieved {plans.Count} public plans for community");
            return JsonSerializer.Serialize(plans);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching public plans: {ex.Number} - {ex.Message}");
            return "[]";
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching public plans: {ex.Message}");
            return "[]";
        }
    }

    public string? GetUserProfileJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"👤 Fetching user profile for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"SELECT id, username, email, bio, created_at 
                                FROM users 
                                WHERE id = @u";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            
            if (!reader.Read())
            {
                Console.WriteLine($"✗ User {userId} not found");
                return null;
            }
            
            var profile = new Dictionary<string, object>
            {
                ["id"] = reader.GetInt32("id"),
                ["username"] = reader.GetString("username"),
                ["email"] = reader.GetString("email"),
                ["bio"] = reader.IsDBNull(reader.GetOrdinal("bio")) ? null! : reader.GetString("bio"),
                ["created_at"] = reader.GetDateTime("created_at").ToString("yyyy-MM-ddTHH:mm:ss")
            };
            
            Console.WriteLine($"✓ Retrieved user profile for user {userId}");
            return JsonSerializer.Serialize(profile);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching user profile: {ex.Number} - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching user profile: {ex.Message}");
            return null;
        }
    }

    public bool UpdateUserProfile(int userId, string username, string email, string? bio)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"👤 Updating user profile for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"UPDATE users 
                                SET username = @u, email = @e, bio = @b, updated_at = CURRENT_TIMESTAMP 
                                WHERE id = @id";
            cmd.Parameters.AddWithValue("@u", username);
            cmd.Parameters.AddWithValue("@e", email);
            cmd.Parameters.AddWithValue("@b", string.IsNullOrWhiteSpace(bio) ? (object)DBNull.Value : bio);
            cmd.Parameters.AddWithValue("@id", userId);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            
            if (rowsAffected == 1)
            {
                Console.WriteLine($"✓ Updated user profile for user {userId}");
                return true;
            }
            
            _lastError = "User not found or update failed";
            Console.WriteLine($"✗ Failed to update user profile for user {userId}");
            return false;
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            _lastError = "Username or email already exists";
            Console.WriteLine($"✗ Duplicate username/email: {ex.Message}");
            return false;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error updating user profile: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error updating user profile: {ex.Message}");
            return false;
        }
    }

    public bool UpdateUserPassword(int userId, string currentPasswordHash, string newPasswordHash)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔐 Updating password for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // First verify current password
            using var verifyCmd = conn.CreateCommand();
            verifyCmd.CommandText = "SELECT password_hash FROM users WHERE id = @id";
            verifyCmd.Parameters.AddWithValue("@id", userId);
            
            using var reader = verifyCmd.ExecuteReader();
            if (!reader.Read())
            {
                _lastError = "User not found";
                return false;
            }
            
            var storedHash = reader.GetString("password_hash");
            reader.Close();
            
            if (storedHash != currentPasswordHash)
            {
                _lastError = "Current password is incorrect";
                Console.WriteLine($"✗ Password verification failed for user {userId}");
                return false;
            }
            
            // Update password
            using var updateCmd = conn.CreateCommand();
            updateCmd.CommandText = "UPDATE users SET password_hash = @p, updated_at = CURRENT_TIMESTAMP WHERE id = @id";
            updateCmd.Parameters.AddWithValue("@p", newPasswordHash);
            updateCmd.Parameters.AddWithValue("@id", userId);
            
            var rowsAffected = updateCmd.ExecuteNonQuery();
            
            if (rowsAffected == 1)
            {
                Console.WriteLine($"✓ Updated password for user {userId}");
                return true;
            }
            
            _lastError = "Failed to update password";
            return false;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error updating password: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error updating password: {ex.Message}");
            return false;
        }
    }

    public string? GetUserSettingsJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"⚙️ Fetching user settings for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"SELECT date_format, week_start_day, email_reminders_enabled, 
                                reminder_timezone, reminder_frequency, professions 
                                FROM user_settings 
                                WHERE user_id = @u";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            
            Dictionary<string, object> settings;
            
            if (reader.Read())
            {
                settings = new Dictionary<string, object>
                {
                    ["date_format"] = reader.IsDBNull(reader.GetOrdinal("date_format")) ? "MM/DD/YYYY" : reader.GetString("date_format"),
                    ["week_start_day"] = reader.IsDBNull(reader.GetOrdinal("week_start_day")) ? "Monday" : reader.GetString("week_start_day"),
                    ["email_reminders_enabled"] = reader.GetBoolean("email_reminders_enabled"),
                    ["reminder_timezone"] = reader.IsDBNull(reader.GetOrdinal("reminder_timezone")) ? "GMT +00:00" : reader.GetString("reminder_timezone"),
                    ["reminder_frequency"] = reader.IsDBNull(reader.GetOrdinal("reminder_frequency")) ? "Daily @ 8AM" : reader.GetString("reminder_frequency"),
                    ["professions"] = reader.IsDBNull(reader.GetOrdinal("professions")) ? "[]" : reader.GetString("professions")
                };
            }
            else
            {
                // Return default settings if none exist
                settings = new Dictionary<string, object>
                {
                    ["date_format"] = "MM/DD/YYYY",
                    ["week_start_day"] = "Monday",
                    ["email_reminders_enabled"] = false,
                    ["reminder_timezone"] = "GMT +00:00",
                    ["reminder_frequency"] = "Daily @ 8AM",
                    ["professions"] = "[]"
                };
            }
            
            Console.WriteLine($"✓ Retrieved user settings for user {userId}");
            return JsonSerializer.Serialize(settings);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching user settings: {ex.Number} - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching user settings: {ex.Message}");
            return null;
        }
    }

    public bool UpdateUserSettings(int userId, string? dateFormat, string? weekStartDay, bool? emailRemindersEnabled, string? reminderTimezone, string? reminderFrequency, string? professionsJson)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"⚙️ Updating user settings for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Check if settings exist
            using var checkCmd = conn.CreateCommand();
            checkCmd.CommandText = "SELECT COUNT(*) FROM user_settings WHERE user_id = @u";
            checkCmd.Parameters.AddWithValue("@u", userId);
            var exists = Convert.ToInt32(checkCmd.ExecuteScalar()) > 0;
            
            if (exists)
            {
                // Update existing settings
                using var updateCmd = conn.CreateCommand();
                updateCmd.CommandText = @"UPDATE user_settings 
                                        SET date_format = COALESCE(@df, date_format),
                                            week_start_day = COALESCE(@wsd, week_start_day),
                                            email_reminders_enabled = COALESCE(@ere, email_reminders_enabled),
                                            reminder_timezone = COALESCE(@rt, reminder_timezone),
                                            reminder_frequency = COALESCE(@rf, reminder_frequency),
                                            professions = COALESCE(@prof, professions),
                                            updated_at = CURRENT_TIMESTAMP
                                        WHERE user_id = @u";
                updateCmd.Parameters.AddWithValue("@u", userId);
                updateCmd.Parameters.AddWithValue("@df", dateFormat ?? (object)DBNull.Value);
                updateCmd.Parameters.AddWithValue("@wsd", weekStartDay ?? (object)DBNull.Value);
                updateCmd.Parameters.AddWithValue("@ere", emailRemindersEnabled ?? (object)DBNull.Value);
                updateCmd.Parameters.AddWithValue("@rt", reminderTimezone ?? (object)DBNull.Value);
                updateCmd.Parameters.AddWithValue("@rf", reminderFrequency ?? (object)DBNull.Value);
                updateCmd.Parameters.AddWithValue("@prof", professionsJson ?? (object)DBNull.Value);
                
                updateCmd.ExecuteNonQuery();
            }
            else
            {
                // Insert new settings
                using var insertCmd = conn.CreateCommand();
                insertCmd.CommandText = @"INSERT INTO user_settings 
                                        (user_id, date_format, week_start_day, email_reminders_enabled, 
                                         reminder_timezone, reminder_frequency, professions)
                                        VALUES (@u, @df, @wsd, @ere, @rt, @rf, @prof)";
                insertCmd.Parameters.AddWithValue("@u", userId);
                insertCmd.Parameters.AddWithValue("@df", dateFormat ?? "MM/DD/YYYY");
                insertCmd.Parameters.AddWithValue("@wsd", weekStartDay ?? "Monday");
                insertCmd.Parameters.AddWithValue("@ere", emailRemindersEnabled ?? false);
                insertCmd.Parameters.AddWithValue("@rt", reminderTimezone ?? "GMT +00:00");
                insertCmd.Parameters.AddWithValue("@rf", reminderFrequency ?? "Daily @ 8AM");
                insertCmd.Parameters.AddWithValue("@prof", professionsJson ?? "[]");
                
                insertCmd.ExecuteNonQuery();
            }
            
            Console.WriteLine($"✓ Updated user settings for user {userId}");
            return true;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error updating user settings: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error updating user settings: {ex.Message}");
            return false;
        }
    }

    public bool DeleteUserAccount(int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🗑️ Deleting user account {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Delete user (cascade will handle related data)
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM users WHERE id = @id";
            cmd.Parameters.AddWithValue("@id", userId);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            
            if (rowsAffected == 1)
            {
                Console.WriteLine($"✓ Deleted user account {userId}");
                return true;
            }
            
            _lastError = "User not found";
            Console.WriteLine($"✗ User {userId} not found");
            return false;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error deleting user account: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error deleting user account: {ex.Message}");
            return false;
        }
    }

    public string GetStatsJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📊 Fetching stats for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Get all plan_days for user's plans, aggregated by date
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT 
                    pd.date,
                    COALESCE(SUM(pd.actual_count), 0) as daily_count
                FROM plan_days pd
                INNER JOIN plans p ON pd.plan_id = p.id
                WHERE p.user_id = @u
                    AND pd.date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                GROUP BY pd.date
                ORDER BY pd.date ASC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var dailyStats = new Dictionary<string, int>();
            
            while (reader.Read())
            {
                var date = reader.GetDateTime("date").ToString("yyyy-MM-dd");
                var count = reader.GetInt32("daily_count");
                dailyStats[date] = count;
            }
            
            reader.Close();
            
            // Get total words across all plans
            using var totalCmd = conn.CreateCommand();
            totalCmd.CommandText = @"
                SELECT COALESCE(SUM(pd.actual_count), 0) as total_words
                FROM plan_days pd
                INNER JOIN plans p ON pd.plan_id = p.id
                WHERE p.user_id = @u";
            totalCmd.Parameters.AddWithValue("@u", userId);
            var totalWords = Convert.ToInt64(totalCmd.ExecuteScalar());
            
            // Generate activity data for last 90 days (fill missing days with 0)
            var today = DateTime.Today;
            var activityData = new List<Dictionary<string, object>>();
            var allDaysData = new List<Dictionary<string, object>>();
            long cumulative = 0;
            int bestDay = 0;
            int currentStreak = 0;
            
            // Build all days data first
            for (int i = 89; i >= 0; i--)
            {
                var date = today.AddDays(-i);
                var dateKey = date.ToString("yyyy-MM-dd");
                var count = dailyStats.ContainsKey(dateKey) ? dailyStats[dateKey] : 0;
                
                cumulative += count;
                
                if (count > bestDay)
                {
                    bestDay = count;
                }
                
                var dayData = new Dictionary<string, object>
                {
                    ["date"] = dateKey,
                    ["count"] = count
                };
                
                allDaysData.Add(dayData);
                
                // Last 14 days for bar chart
                if (i < 14)
                {
                    activityData.Add(dayData);
                }
            }
            
            // Calculate streak (count backwards from today)
            for (int i = 0; i < allDaysData.Count; i++)
            {
                var dayData = allDaysData[i];
                var count = Convert.ToInt32(dayData["count"]);
                
                if (count > 0)
                {
                    currentStreak++;
                }
                else
                {
                    break; // Streak broken
                }
            }
            
            // Calculate weekly average (last 90 days = ~12.86 weeks)
            var weeklyAvg = totalWords > 0 ? (int)Math.Round(totalWords / 12.86) : 0;
            
            var stats = new Dictionary<string, object>
            {
                ["totalWords"] = totalWords,
                ["weeklyAvg"] = weeklyAvg,
                ["bestDay"] = bestDay,
                ["currentStreak"] = currentStreak,
                ["activityData"] = activityData, // Last 14 days
                ["allDaysData"] = allDaysData   // Last 90 days for line chart and heatmap
            };
            
            Console.WriteLine($"✓ Retrieved stats: Total={totalWords}, WeeklyAvg={weeklyAvg}, BestDay={bestDay}, Streak={currentStreak}");
            return JsonSerializer.Serialize(stats);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching stats: {ex.Number} - {ex.Message}");
            // Return default stats on error
            var defaultStats = new Dictionary<string, object>
            {
                ["totalWords"] = 0,
                ["weeklyAvg"] = 0,
                ["bestDay"] = 0,
                ["currentStreak"] = 0,
                ["activityData"] = new List<object>(),
                ["allDaysData"] = new List<object>()
            };
            return JsonSerializer.Serialize(defaultStats);
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching stats: {ex.Message}");
            // Return default stats on error
            var defaultStats = new Dictionary<string, object>
            {
                ["totalWords"] = 0,
                ["weeklyAvg"] = 0,
                ["bestDay"] = 0,
                ["currentStreak"] = 0,
                ["activityData"] = new List<object>(),
                ["allDaysData"] = new List<object>()
            };
            return JsonSerializer.Serialize(defaultStats);
        }
    }

    public int CreateFeedback(int? userId, string type, string? email, string message)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"💬 Creating feedback: Type={type}, UserId={userId?.ToString() ?? "null"}, Email={email ?? "null"}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"INSERT INTO feedback (user_id, type, email, message) 
                               VALUES (@uid, @type, @email, @msg); 
                               SELECT LAST_INSERT_ID();";
            cmd.Parameters.AddWithValue("@uid", userId ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@type", type);
            cmd.Parameters.AddWithValue("@email", string.IsNullOrWhiteSpace(email) ? (object)DBNull.Value : email);
            cmd.Parameters.AddWithValue("@msg", message);
            
            var result = cmd.ExecuteScalar();
            var feedbackId = result is long l ? (int)l : (result is int i ? i : (result is ulong ul ? (int)ul : -1));
            
            if (feedbackId > 0)
            {
                Console.WriteLine($"✓ Feedback created with ID: {feedbackId}");
                return feedbackId;
            }
            
            Console.WriteLine($"✗ Failed to create feedback");
            return -1;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error creating feedback: {ex.Number} - {ex.Message}");
            return -1;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error creating feedback: {ex.Message}");
            return -1;
        }
    }

    // ============================================================================
    // Projects (Organization Plans)
    // ============================================================================

    public int CreateProject(int userId, string name, string? subtitle, string? description, bool isPrivate)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for CreateProject");
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"INSERT INTO projects (user_id, name, subtitle, description, is_private) 
                               VALUES (@uid, @name, @subtitle, @desc, @private);
                               SELECT LAST_INSERT_ID();";
            cmd.Parameters.AddWithValue("@uid", userId);
            cmd.Parameters.AddWithValue("@name", name);
            cmd.Parameters.AddWithValue("@subtitle", string.IsNullOrWhiteSpace(subtitle) ? (object)DBNull.Value : subtitle);
            cmd.Parameters.AddWithValue("@desc", string.IsNullOrWhiteSpace(description) ? (object)DBNull.Value : description);
            cmd.Parameters.AddWithValue("@private", isPrivate);
            
            var result = cmd.ExecuteScalar();
            var projectId = result is long l ? (int)l : (result is int i ? i : (result is ulong ul ? (int)ul : -1));
            
            if (projectId > 0)
            {
                Console.WriteLine($"✓ Project created: {name} (ID: {projectId})");
                return projectId;
            }
            
            Console.WriteLine($"✗ Failed to create project");
            return -1;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in CreateProject: {ex.Number} - {ex.Message}");
            return -1;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in CreateProject: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return -1;
        }
    }

    public string GetProjectsJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for GetProjectsJson");
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"SELECT id, name, subtitle, description, is_private, created_at 
                               FROM projects 
                               WHERE user_id = @uid 
                               ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@uid", userId);
            
            using var reader = cmd.ExecuteReader();
            var projects = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var project = new Dictionary<string, object>
                {
                    ["id"] = reader.GetInt32(0),
                    ["name"] = reader.GetString(1),
                    ["subtitle"] = reader.IsDBNull(2) ? null : reader.GetString(2),
                    ["description"] = reader.IsDBNull(3) ? null : reader.GetString(3),
                    ["is_private"] = reader.GetBoolean(4),
                    ["created_at"] = reader.IsDBNull(5) ? null : reader.GetDateTime(5).ToString("yyyy-MM-ddTHH:mm:ss")
                };
                projects.Add(project);
            }
            
            Console.WriteLine($"✓ Retrieved {projects.Count} projects");
            return JsonSerializer.Serialize(projects);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in GetProjectsJson: {ex.Number} - {ex.Message}");
            return "[]";
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in GetProjectsJson: {ex.Message}");
            return "[]";
        }
    }

    public string? GetProjectJson(int id, int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for GetProjectJson");
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"SELECT id, name, subtitle, description, is_private, created_at 
                               FROM projects 
                               WHERE id = @id AND user_id = @uid 
                               LIMIT 1";
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@uid", userId);
            
            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                var project = new Dictionary<string, object>
                {
                    ["id"] = reader.GetInt32(0),
                    ["name"] = reader.GetString(1),
                    ["subtitle"] = reader.IsDBNull(2) ? null : reader.GetString(2),
                    ["description"] = reader.IsDBNull(3) ? null : reader.GetString(3),
                    ["is_private"] = reader.GetBoolean(4),
                    ["created_at"] = reader.IsDBNull(5) ? null : reader.GetDateTime(5).ToString("yyyy-MM-ddTHH:mm:ss")
                };
                
                Console.WriteLine($"✓ Retrieved project: {project["name"]}");
                return JsonSerializer.Serialize(project);
            }
            
            Console.WriteLine($"✗ Project not found: {id}");
            return null;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in GetProjectJson: {ex.Number} - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in GetProjectJson: {ex.Message}");
            return null;
        }
    }

    public bool UpdateProject(int id, int userId, string name, string? subtitle, string? description, bool isPrivate)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for UpdateProject");
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"UPDATE projects 
                               SET name = @name, subtitle = @subtitle, description = @desc, is_private = @private 
                               WHERE id = @id AND user_id = @uid";
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@uid", userId);
            cmd.Parameters.AddWithValue("@name", name);
            cmd.Parameters.AddWithValue("@subtitle", string.IsNullOrWhiteSpace(subtitle) ? (object)DBNull.Value : subtitle);
            cmd.Parameters.AddWithValue("@desc", string.IsNullOrWhiteSpace(description) ? (object)DBNull.Value : description);
            cmd.Parameters.AddWithValue("@private", isPrivate);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            if (rowsAffected > 0)
            {
                Console.WriteLine($"✓ Project updated: {name} (ID: {id})");
                return true;
            }
            
            Console.WriteLine($"✗ Project not found or no changes made: {id}");
            return false;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in UpdateProject: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in UpdateProject: {ex.Message}");
            return false;
        }
    }

    public bool DeleteProject(int id, int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for DeleteProject");
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM projects WHERE id = @id AND user_id = @uid";
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@uid", userId);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            if (rowsAffected > 0)
            {
                Console.WriteLine($"✓ Project deleted: {id}");
                return true;
            }
            
            Console.WriteLine($"✗ Project not found or no permission: {id}");
            return false;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in DeleteProject: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in DeleteProject: {ex.Message}");
            return false;
        }
    }
}
