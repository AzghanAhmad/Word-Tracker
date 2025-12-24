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
}
