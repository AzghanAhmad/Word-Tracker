using MySqlConnector;
using System.Text.Json;
using System.Linq;

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
            // Set default avatar URL when creating user
            const string defaultAvatarUrl = "/uploads/avatars/test_avatar.png";
            cmd.CommandText = "INSERT INTO users (username,email,password_hash,avatar_url) VALUES (@u,@e,@p,@a)";
            cmd.Parameters.AddWithValue("@u", username);
            cmd.Parameters.AddWithValue("@e", email);
            cmd.Parameters.AddWithValue("@p", passwordHash);
            cmd.Parameters.AddWithValue("@a", defaultAvatarUrl);
            var result = cmd.ExecuteNonQuery() == 1;
            if (result)
                Console.WriteLine($"✓ User created: {username} ({email}) with default avatar");
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
    public int CreatePlan(int userId, string title, int totalWordCount, string startDate, string endDate, string algorithmType, string? description, bool isPrivate, int startingPoint, string? measurementUnit, bool isDailyTarget, bool fixedDeadline, string? targetFinishDate, string? strategyIntensity, string? weekendApproach, int reserveDays, string displayViewType, string weekStartDay, string groupingType, string dashboardColor, bool showHistoricalData, string progressTrackingType, string? activityType, string? contentType, string? status, int? currentProgress)
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
                (user_id,title,total_word_count,start_date,end_date,algorithm_type,description,is_private,starting_point,measurement_unit,is_daily_target,fixed_deadline,target_finish_date,strategy_intensity,weekend_approach,reserve_days,display_view_type,week_start_day,grouping_type,dashboard_color,show_historical_data,progress_tracking_type,activity_type,content_type,status,current_progress)
                VALUES (@user_id,@title,@total,@start,@end,@algo,@desc,@priv,@startp,@meas,@daily,@fixed,@target,@strat,@weekend,@reserve,@view,@wstart,@group,@color,@hist,@track,@activity,@content,@status,@curr_prog);
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
            cmd.Parameters.AddWithValue("@status", string.IsNullOrWhiteSpace(status) ? "active" : status);
            cmd.Parameters.AddWithValue("@curr_prog", currentProgress ?? 0);
            
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
                
                // After creating the plan, generate initial plan_days with the specified strategy
                // This ensures plan_days exist immediately after creation
                try
                {
                    Console.WriteLine($"🔄 Generating initial plan_days for newly created plan {planId}...");
                    RegeneratePlanDays(planId, totalWordCount, startDate, endDate, algorithmType, strategyIntensity, weekendApproach, conn);
                    Console.WriteLine($"✅ Initial plan_days generated for plan {planId}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠ Warning: Could not generate initial plan_days for plan {planId}: {ex.Message}");
                    // Don't fail plan creation - plan_days will be generated on first access
                }
                
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

    public bool UpdatePlan(int planId, int userId, string title, int totalWordCount, string startDate, string endDate, string algorithmType, string? description, bool isPrivate, int startingPoint, string? measurementUnit, bool isDailyTarget, bool fixedDeadline, string? targetFinishDate, string? strategyIntensity, string? weekendApproach, int reserveDays, string displayViewType, string weekStartDay, string groupingType, string dashboardColor, bool showHistoricalData, string progressTrackingType, string? activityType, string? contentType, string? status, int? currentProgress)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔄 Updating plan {planId} for user {userId}: Title={title}, Status={status}, Progress={currentProgress}");
            
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
                content_type=@content,
                status=@status,
                current_progress=@curr_prog
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
            
            // Auto-update status to 'completed' if progress reaches 100%
            string finalStatus = status ?? "active";
            if (currentProgress.HasValue && currentProgress.Value >= 100)
            {
                finalStatus = "completed";
                Console.WriteLine($"🎉 Plan {planId} reached 100% progress! Auto-marking as completed.");
            }
            else if (string.IsNullOrWhiteSpace(status))
            {
                finalStatus = "active";
            }
            
            cmd.Parameters.AddWithValue("@status", finalStatus);
            cmd.Parameters.AddWithValue("@curr_prog", currentProgress ?? 0);
            
            // Check if strategy-related fields changed by comparing with existing plan BEFORE updating
            bool needsRegeneration = false;
            string? oldAlgorithmType = null;
            int? oldTotalWordCount = null;
            string? oldStartDate = null;
            string? oldEndDate = null;
            string? oldWeekendApproach = null;
            
            using (var checkCmd = conn.CreateCommand())
            {
                checkCmd.CommandText = "SELECT algorithm_type, total_word_count, start_date, end_date, weekend_approach FROM plans WHERE id=@pid";
                checkCmd.Parameters.AddWithValue("@pid", planId);
                using var reader = checkCmd.ExecuteReader();
                if (reader.Read())
                {
                    oldAlgorithmType = reader.IsDBNull(0) ? null : reader.GetString(0);
                    oldTotalWordCount = reader.IsDBNull(1) ? 0 : reader.GetInt32(1);
                    oldStartDate = reader.IsDBNull(2) ? null : reader.GetDateTime(2).ToString("yyyy-MM-dd");
                    oldEndDate = reader.IsDBNull(3) ? null : reader.GetDateTime(3).ToString("yyyy-MM-dd");
                    oldWeekendApproach = reader.IsDBNull(4) ? null : reader.GetString(4);
                }
            }
            
            // Normalize values for comparison (handle null/empty cases)
            string normalizedOldAlgorithm = (oldAlgorithmType ?? "").ToLower().Trim();
            string normalizedNewAlgorithm = (algorithmType ?? "").ToLower().Trim();
            string normalizedOldWeekend = (oldWeekendApproach ?? "").Trim();
            string normalizedNewWeekend = (weekendApproach ?? "").Trim();
            int oldTotal = oldTotalWordCount ?? 0;
            
            // Check if any strategy-affecting fields changed
            // Always check, even if oldAlgorithmType is null (plan might have been created without plan_days)
            needsRegeneration = 
                normalizedOldAlgorithm != normalizedNewAlgorithm ||
                oldTotal != totalWordCount ||
                (oldStartDate ?? "") != (startDate ?? "") ||
                (oldEndDate ?? "") != (endDate ?? "") ||
                normalizedOldWeekend != normalizedNewWeekend;
            
            Console.WriteLine($"🔍 Strategy change detection for plan {planId}:");
            Console.WriteLine($"   Algorithm: '{normalizedOldAlgorithm}' -> '{normalizedNewAlgorithm}' (changed: {normalizedOldAlgorithm != normalizedNewAlgorithm})");
            Console.WriteLine($"   Total words: {oldTotal} -> {totalWordCount} (changed: {oldTotal != totalWordCount})");
            Console.WriteLine($"   Dates: '{oldStartDate}' to '{oldEndDate}' -> '{startDate}' to '{endDate}'");
            Console.WriteLine($"   Weekend approach: '{normalizedOldWeekend}' -> '{normalizedNewWeekend}' (changed: {normalizedOldWeekend != normalizedNewWeekend})");
            Console.WriteLine($"   ✅ Needs regeneration: {needsRegeneration}");
            
            var rowsAffected = cmd.ExecuteNonQuery();
            
            if (rowsAffected > 0)
            {
                Console.WriteLine($"✓ Plan {planId} updated successfully");
                
                // Always regenerate plan_days when strategy-related fields changed
                // This ensures plan_days are always in sync with the plan's strategy
                if (needsRegeneration)
                {
                    Console.WriteLine($"🔄 Strategy or schedule parameters changed, regenerating plan_days...");
                    Console.WriteLine($"   Regenerating with algorithm: {algorithmType}, intensity: {strategyIntensity}, weekend: {weekendApproach}");
                    
                    try
                    {
                        // Regenerate plan days with new strategy - this will update all target_count values
                        // Ensure non-null values before calling RegeneratePlanDays
                        if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate) && !string.IsNullOrEmpty(algorithmType))
                        {
                            RegeneratePlanDays(planId, totalWordCount, startDate, endDate, algorithmType, strategyIntensity, weekendApproach, conn);
                            Console.WriteLine($"✅ Plan days regeneration completed successfully for plan {planId}");
                        }
                        else
                        {
                            Console.WriteLine($"⚠ Warning: Cannot regenerate plan days - missing required parameters (startDate, endDate, or algorithmType)");
                        }
                    }
                    catch (Exception regenEx)
                    {
                        Console.WriteLine($"❌ Error during plan days regeneration: {regenEx.Message}");
                        Console.WriteLine($"Stack trace: {regenEx.StackTrace}");
                        // Don't fail the update - log the error but allow the plan update to succeed
                    }
                }
                else
                {
                    Console.WriteLine($"ℹ No strategy changes detected, plan_days remain unchanged");
                }
                
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
    /// Regenerates plan_days with new target_count values based on updated strategy/parameters
    /// Preserves existing actual_count and notes
    /// </summary>
    private void RegeneratePlanDays(int planId, int totalWordCount, string startDate, string endDate, string algorithmType, string? strategyIntensity, string? weekendApproach, MySqlConnection conn)
    {
        try
        {
            Console.WriteLine($"🔄 Regenerating plan_days for plan {planId} with algorithm: {algorithmType}, intensity: {strategyIntensity}");
            
            // Parse dates
            if (!DateTime.TryParse(startDate, out var start) || !DateTime.TryParse(endDate, out var end))
            {
                Console.WriteLine($"✗ Invalid dates for plan {planId}: {startDate} to {endDate}");
                return;
            }

            // Get existing plan_days to preserve actual_count and notes
            var existingDays = new Dictionary<string, (int actualCount, string? notes)>();
            using (var getExistingCmd = conn.CreateCommand())
            {
                getExistingCmd.CommandText = "SELECT date, actual_count, notes FROM plan_days WHERE plan_id = @pid";
                getExistingCmd.Parameters.AddWithValue("@pid", planId);
                using var reader = getExistingCmd.ExecuteReader();
                while (reader.Read())
                {
                    var dateKey = reader.GetDateTime(0).ToString("yyyy-MM-dd");
                    var actualCount = reader.IsDBNull(1) ? 0 : reader.GetInt32(1);
                    var notes = reader.IsDBNull(2) ? null : reader.GetString(2);
                    existingDays[dateKey] = (actualCount, notes);
                }
            }

            // Calculate total days and writing days
            int totalDaysCount = (int)(end - start).TotalDays + 1;
            if (totalDaysCount <= 0 || totalDaysCount > 1000)
            {
                Console.WriteLine($"✗ Invalid date range for plan {planId}: {totalDaysCount} days");
                return;
            }

            // Count writing days based on weekend approach
            int writingDaysCount = 0;
            for (int i = 0; i < totalDaysCount; i++)
            {
                var currDate = start.AddDays(i);
                bool isWeekend = currDate.DayOfWeek == DayOfWeek.Saturday || currDate.DayOfWeek == DayOfWeek.Sunday;
                bool isWritingDay = true;
                
                if (weekendApproach == "Weekdays Only" || weekendApproach == "None" || weekendApproach == "Rest Days")
                {
                    isWritingDay = !isWeekend;
                }
                
                if (isWritingDay) writingDaysCount++;
            }
            if (writingDaysCount == 0) writingDaysCount = 1;

            // Calculate intensity multiplier from strategy intensity
            double intensityMultiplier = 0.5; // Default Average
            if (!string.IsNullOrWhiteSpace(strategyIntensity))
            {
                switch (strategyIntensity.ToLower())
                {
                    case "gentle": intensityMultiplier = 0.1; break;
                    case "low": intensityMultiplier = 0.25; break;
                    case "average": intensityMultiplier = 0.5; break;
                    case "medium": intensityMultiplier = 0.75; break;
                    case "hard core": intensityMultiplier = 1.0; break;
                }
            }

            // First pass: Collect all writing days and calculate relative targets
            var writingDayIndices = new List<int>();
            for (int i = 0; i < totalDaysCount; i++)
            {
                var currDate = start.AddDays(i);
                bool isWeekend = currDate.DayOfWeek == DayOfWeek.Saturday || currDate.DayOfWeek == DayOfWeek.Sunday;
                bool isWritingDay = true;
                if (weekendApproach == "Weekdays Only" || weekendApproach == "None" || weekendApproach == "Rest Days")
                {
                    isWritingDay = !isWeekend;
                }
                if (isWritingDay)
                {
                    writingDayIndices.Add(i);
                }
            }

            // Calculate relative weights for each writing day based on strategy
            var dayWeights = new List<double>();
            double totalWeight = 0;
            
            for (int idx = 0; idx < writingDayIndices.Count; idx++)
            {
                int dayIndex = writingDayIndices[idx];
                double t = writingDayIndices.Count > 1 ? (double)idx / (writingDayIndices.Count - 1) : 0;
                double weight = 1.0; // Default weight for Steady
                
                // Apply algorithm modifiers (matching frontend logic)
                switch (algorithmType.ToLower())
                {
                    case "front-load":
                        weight = (1 + intensityMultiplier) - (intensityMultiplier * 2 * t);
                        break;
                    case "back-load":
                        weight = (1 - intensityMultiplier) + (intensityMultiplier * 2 * t);
                        break;
                    case "mountain":
                        double factor = 1 - Math.Abs(0.5 - t) * 2;
                        weight = (1 - intensityMultiplier) + (intensityMultiplier * 2 * factor);
                        break;
                    case "valley":
                        double valleyFactor = Math.Abs(0.5 - t) * 2;
                        weight = (1 - intensityMultiplier) + (intensityMultiplier * 2 * valleyFactor);
                        break;
                    case "oscillating":
                        double sineFactor = Math.Sin(t * Math.PI * (intensityMultiplier * 8)) * intensityMultiplier + 1;
                        weight = sineFactor;
                        break;
                    case "randomly":
                        var currDate = start.AddDays(dayIndex);
                        int seed = currDate.Day + currDate.Month * 31;
                        double pseudoRandom = ((seed * 1103515245 + 12345) & 0x7fffffff) / (double)0x7fffffff;
                        weight = (1 - intensityMultiplier) + (pseudoRandom * intensityMultiplier * 2);
                        break;
                    case "steady":
                    default:
                        weight = 1.0;
                        break;
                }
                
                weight = Math.Max(0.1, weight); // Ensure minimum weight to avoid zero targets
                dayWeights.Add(weight);
                totalWeight += weight;
            }

            // Calculate target for each day
            var dayTargets = new Dictionary<int, int>(); // day index -> target count

            // First pass: calculate targets based on weights
            for (int idx = 0; idx < writingDayIndices.Count; idx++)
            {
                int dayIndex = writingDayIndices[idx];
                double weight = dayWeights[idx];
                double baseTarget = totalWeight > 0 ? (totalWordCount * weight / totalWeight) : (totalWordCount / writingDayIndices.Count);
                int target = Math.Max(0, (int)Math.Round(baseTarget));
                dayTargets[dayIndex] = target;
            }

            // Normalize to ensure total matches exactly
            int currentTotal = dayTargets.Values.Sum();
            int difference = totalWordCount - currentTotal;
            
            if (difference != 0 && dayTargets.Count > 0)
            {
                // Distribute the difference to ensure exact total
                if (Math.Abs(difference) <= dayTargets.Count)
                {
                    // Small difference - distribute to days (prioritize last day for remainder)
                    var sortedDays = writingDayIndices.OrderByDescending(i => dayTargets[i]).ToList();
                    int absDiff = Math.Abs(difference);
                    int sign = difference > 0 ? 1 : -1;
                    
                    for (int i = 0; i < absDiff && i < sortedDays.Count; i++)
                    {
                        int dayIdx = sortedDays[i];
                        dayTargets[dayIdx] += sign;
                        // Ensure we don't go negative
                        if (dayTargets[dayIdx] < 0) dayTargets[dayIdx] = 0;
                    }
                }
                else
                {
                    // Larger difference - distribute proportionally
                    var sortedDays = writingDayIndices.OrderByDescending(i => dayTargets[i]).ToList();
                    int perDay = difference / sortedDays.Count;
                    int remainder = Math.Abs(difference % sortedDays.Count);
                    int sign = difference > 0 ? 1 : -1;
                    
                    for (int i = 0; i < sortedDays.Count; i++)
                    {
                        int dayIdx = sortedDays[i];
                        dayTargets[dayIdx] += perDay;
                        if (i < remainder)
                        {
                            dayTargets[dayIdx] += sign;
                        }
                        // Ensure we don't go negative
                        if (dayTargets[dayIdx] < 0) dayTargets[dayIdx] = 0;
                    }
                }
                
                // Final check - ensure last day gets any remaining difference
                int finalTotal = dayTargets.Values.Sum();
                int finalDiff = totalWordCount - finalTotal;
                if (finalDiff != 0 && dayTargets.Count > 0)
                {
                    int lastDayIdx = writingDayIndices[writingDayIndices.Count - 1];
                    dayTargets[lastDayIdx] += finalDiff;
                    if (dayTargets[lastDayIdx] < 0) dayTargets[lastDayIdx] = 0;
                }
            }
            
            Console.WriteLine($"📊 Calculated {dayTargets.Count} writing day targets, total: {dayTargets.Values.Sum()}, target: {totalWordCount}");

            // Generate targets for each day
            for (int i = 0; i < totalDaysCount; i++)
            {
                var currDate = start.AddDays(i);
                var dateKey = currDate.ToString("yyyy-MM-dd");
                bool isWeekend = currDate.DayOfWeek == DayOfWeek.Saturday || currDate.DayOfWeek == DayOfWeek.Sunday;
                
                bool isWritingDay = true;
                if (weekendApproach == "Weekdays Only" || weekendApproach == "None" || weekendApproach == "Rest Days")
                {
                    isWritingDay = !isWeekend;
                }

                int targetCount = 0;
                if (isWritingDay && dayTargets.ContainsKey(i))
                {
                    targetCount = dayTargets[i];
                }

                // Get existing actual_count and notes (preserve user's logged progress)
                int actualCount = 0;
                string? notes = null;
                if (existingDays.ContainsKey(dateKey))
                {
                    actualCount = existingDays[dateKey].actualCount;
                    notes = existingDays[dateKey].notes;
                }

                // Update or insert plan_day - ALWAYS update target_count, preserve existing actual_count and notes
                using (var updateCmd = conn.CreateCommand())
                {
                    // Use INSERT...ON DUPLICATE KEY UPDATE
                    // On INSERT (new day): insert with calculated target_count, 0 actual_count, NULL notes
                    // On UPDATE (existing day): explicitly preserve actual_count and notes, only update target_count
                    updateCmd.CommandText = @"
                        INSERT INTO plan_days (plan_id, date, target_count, actual_count, notes)
                        VALUES (@pid, @date, @target, @actual, @notes)
                        ON DUPLICATE KEY UPDATE 
                            target_count = @target,
                            actual_count = COALESCE(plan_days.actual_count, @actual),
                            notes = COALESCE(plan_days.notes, @notes)";
                    // Explicitly preserve existing actual_count and notes using COALESCE
                    // This ensures notes and actual_count are never overwritten with NULL/0 when updating target_count
                    updateCmd.Parameters.AddWithValue("@pid", planId);
                    updateCmd.Parameters.AddWithValue("@date", dateKey);
                    updateCmd.Parameters.AddWithValue("@target", targetCount);
                    updateCmd.Parameters.AddWithValue("@actual", actualCount);
                    updateCmd.Parameters.AddWithValue("@notes", notes ?? (object)DBNull.Value);
                    
                    updateCmd.ExecuteNonQuery();
                }
            }

            // Verify the update worked by counting updated rows
            using (var verifyCmd = conn.CreateCommand())
            {
                verifyCmd.CommandText = "SELECT COUNT(*) FROM plan_days WHERE plan_id = @pid AND date >= @start AND date <= @end";
                verifyCmd.Parameters.AddWithValue("@pid", planId);
                verifyCmd.Parameters.AddWithValue("@start", start.ToString("yyyy-MM-dd"));
                verifyCmd.Parameters.AddWithValue("@end", end.ToString("yyyy-MM-dd"));
                var updatedCount = Convert.ToInt32(verifyCmd.ExecuteScalar());
                Console.WriteLine($"✅ Successfully regenerated {totalDaysCount} plan_days for plan {planId} with algorithm: {algorithmType}");
                Console.WriteLine($"   Verified: {updatedCount} plan_days exist in database for date range");
                
                // Also verify a sample of target_count values to ensure they're non-zero for writing days
                if (weekendApproach == "The Usual" && updatedCount > 0)
                {
                    verifyCmd.CommandText = "SELECT COUNT(*) FROM plan_days WHERE plan_id = @pid AND date >= @start AND date <= @end AND target_count > 0";
                    verifyCmd.Parameters.Clear();
                    verifyCmd.Parameters.AddWithValue("@pid", planId);
                    verifyCmd.Parameters.AddWithValue("@start", start.ToString("yyyy-MM-dd"));
                    verifyCmd.Parameters.AddWithValue("@end", end.ToString("yyyy-MM-dd"));
                    var daysWithTargets = Convert.ToInt32(verifyCmd.ExecuteScalar());
                    Console.WriteLine($"   Writing days with targets > 0: {daysWithTargets} / {updatedCount}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Error regenerating plan_days for plan {planId}: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
            }
            // Don't throw - allow the update to succeed even if regeneration fails
            // But log the error so we can debug
            _lastError = $"Error regenerating plan_days: {ex.Message}";
        }
    }

    /// <summary>
    /// Retrieves all plans for a user as JSON
    /// Returns empty array if no plans found
    /// </summary>
    public string GetPlansJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📋 Fetching all plans for user {userId}");
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // First, check if user has any plans at all (for debugging)
            using (var countCmd = conn.CreateCommand())
            {
                countCmd.CommandText = "SELECT COUNT(*) FROM plans WHERE user_id=@u";
                countCmd.Parameters.AddWithValue("@u", userId);
                var totalCount = Convert.ToInt32(countCmd.ExecuteScalar());
                Console.WriteLine($"📊 Total plans for user {userId}: {totalCount}");
            }
            
            using var cmd = conn.CreateCommand();
            
            // Get all plans for user, ordered by ID (newest first)
            // Exclude archived plans - check for both lowercase and capitalized versions
            cmd.CommandText = @"
                SELECT p.*
                FROM plans p 
                WHERE p.user_id=@u 
                AND (p.status IS NULL 
                     OR LOWER(p.status) != 'archived')
                ORDER BY p.id DESC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var list = new List<Dictionary<string, object?>>();
            
            while (reader.Read())
            {
                var dict = new Dictionary<string, object?>();
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    
                    // Skip DBNull values - they can't be serialized
                    if (reader.IsDBNull(i))
                    {
                        dict[fieldName] = null;
                        continue;
                    }
                    
                    try
                    {
                        // Try to get value, handling zero dates
                        object? val = null;
                        try
                        {
                            val = reader.GetValue(i);
                        }
                        catch (Exception dateEx)
                        {
                            // If it's a date conversion error, try to read as string
                            if (dateEx.Message.Contains("DateTime") || dateEx.Message.Contains("date"))
                            {
                                try
                                {
                                    var colType = reader.GetFieldType(i);
                                    if (colType == typeof(DateTime) || colType?.Name.Contains("Date") == true)
                                    {
                                        // Try reading as string instead
                                        var ordinal = reader.GetOrdinal(fieldName);
                                        if (!reader.IsDBNull(ordinal))
                                        {
                                            var dateStr = reader.GetString(ordinal);
                                            if (string.IsNullOrWhiteSpace(dateStr) || dateStr.StartsWith("0000-00-00"))
                                            {
                                                dict[fieldName] = null;
                                                continue;
                                            }
                                            // Try to parse it
                                            if (DateTime.TryParse(dateStr, out var parsedDate))
                                            {
                                                dict[fieldName] = parsedDate.ToString("yyyy-MM-dd");
                                                continue;
                                            }
                                        }
                                    }
                                }
                                catch { }
                            }
                            // If we can't read it, set to null
                            dict[fieldName] = null;
                            continue;
                        }
                        
                        // Skip DBNull values
                        if (val == null || val == DBNull.Value)
                        {
                            dict[fieldName] = null;
                            continue;
                        }
                        
                        // Convert MySQL date types to strings for JSON serialization
                        if (val is DateTime dt)
                        {
                            // Check for zero date (year 1 or before)
                            if (dt.Year <= 1)
                            {
                                dict[fieldName] = null;
                            }
                            else
                            {
                                dict[fieldName] = dt.ToString("yyyy-MM-dd");
                            }
                        }
                        else if (val is DateOnly dateOnly)
                        {
                            if (dateOnly.Year <= 1)
                            {
                                dict[fieldName] = null;
                            }
                            else
                            {
                                dict[fieldName] = dateOnly.ToString("yyyy-MM-dd");
                            }
                        }
                        else if (val is bool boolVal)
                        {
                            dict[fieldName] = boolVal;
                        }
                        else if (val is sbyte || val is byte || val is short || val is ushort || 
                                 val is int || val is uint || val is long || val is ulong)
                        {
                            // Handle all integer types
                            dict[fieldName] = Convert.ToInt64(val);
                        }
                        else if (val is float || val is double || val is decimal)
                        {
                            // Handle floating point types
                            dict[fieldName] = Convert.ToDouble(val);
                        }
                        else
                        {
                            // For strings and other types, use as-is
                            dict[fieldName] = val;
                        }
                    }
                    catch (Exception ex)
                    {
                        // If we can't read the value, set it to null
                        Console.WriteLine($"⚠ Warning: Could not read field {fieldName}: {ex.Message}");
                        dict[fieldName] = null;
                    }
                }
                list.Add(dict);
            }
            
            Console.WriteLine($"✓ Retrieved {list.Count} plans for user {userId}");
            return JsonSerializer.Serialize(list);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching plans for user {userId}: {ex.Number} - {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return "[]";
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching plans for user {userId}: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return "[]";
        }
    }

    public string? GetPlanJson(int id, int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📋 Fetching plan {id} for user {userId}");
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT * FROM plans WHERE id=@id AND user_id=@u LIMIT 1";
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@u", userId);
            using var reader = cmd.ExecuteReader();
            if (!reader.Read())
            {
                Console.WriteLine($"✗ Plan {id} not found for user {userId}");
                return null;
            }
            
            var dict = new Dictionary<string, object?>();
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var fieldName = reader.GetName(i);
                
                // Skip DBNull values - they can't be serialized
                if (reader.IsDBNull(i))
                {
                    dict[fieldName] = null;
                    continue;
                }
                
                object? val = null;
                try
                {
                    // Check field type first to handle dates properly
                    var fieldType = reader.GetFieldType(i);
                    
                    // Handle date fields by reading as string first to avoid MySqlDateTime issues
                    if (fieldType == typeof(DateTime) || fieldType?.Name.Contains("Date") == true)
                    {
                        try
                        {
                            // Try to get as DateTime first
                            var dateVal = reader.GetDateTime(i);
                            if (dateVal.Year <= 1)
                            {
                                dict[fieldName] = null;
                            }
                            else
                            {
                                dict[fieldName] = dateVal.ToString("yyyy-MM-dd");
                            }
                            continue;
                        }
                        catch
                        {
                            // If DateTime fails, try as string
                            try
                            {
                                var dateStr = reader.GetString(i);
                                if (string.IsNullOrWhiteSpace(dateStr) || dateStr.StartsWith("0000-00-00"))
                                {
                                    dict[fieldName] = null;
                                }
                                else if (DateTime.TryParse(dateStr, out var parsedDate))
                                {
                                    dict[fieldName] = parsedDate.ToString("yyyy-MM-dd");
                                }
                                else
                                {
                                    dict[fieldName] = null;
                                }
                                continue;
                            }
                            catch
                            {
                                dict[fieldName] = null;
                                continue;
                            }
                        }
                    }
                    
                    val = reader.GetValue(i);
                }
                catch (Exception dateEx)
                {
                    // If it's a date conversion error, try to read as string
                    if (dateEx.Message.Contains("DateTime") || dateEx.Message.Contains("date"))
                    {
                        try
                        {
                            var colType = reader.GetFieldType(i);
                            if (colType == typeof(DateTime) || colType?.Name.Contains("Date") == true)
                            {
                                // Try reading as string instead
                                var ordinal = reader.GetOrdinal(fieldName);
                                if (!reader.IsDBNull(ordinal))
                                {
                                    var dateStr = reader.GetString(ordinal);
                                    if (string.IsNullOrWhiteSpace(dateStr) || dateStr.StartsWith("0000-00-00"))
                                    {
                                        dict[fieldName] = null;
                                        continue;
                                    }
                                    // Try to parse it
                                    if (DateTime.TryParse(dateStr, out var parsedDate))
                                    {
                                        dict[fieldName] = parsedDate.ToString("yyyy-MM-dd");
                                        continue;
                                    }
                                }
                            }
                        }
                        catch { }
                    }
                    // If we can't read it, set to null
                    dict[fieldName] = null;
                    continue;
                }
                
                // Skip DBNull values
                if (val == null || val == DBNull.Value)
                {
                    dict[fieldName] = null;
                    continue;
                }
                
                // Handle MySqlDateTime type (when AllowZeroDateTime=True, MySqlConnector returns MySqlDateTime)
                var valTypeName = val.GetType().Name;
                if (valTypeName == "MySqlDateTime")
                {
                    try
                    {
                        // Use reflection to access MySqlDateTime properties
                        var type = val.GetType();
                        var isValidProp = type.GetProperty("IsValidDateTime");
                        var yearProp = type.GetProperty("Year");
                        var monthProp = type.GetProperty("Month");
                        var dayProp = type.GetProperty("Day");
                        
                        if (isValidProp != null && yearProp != null && monthProp != null && dayProp != null)
                        {
                            var isValid = (bool)(isValidProp.GetValue(val) ?? false);
                            if (isValid)
                            {
                                var year = (int)(yearProp.GetValue(val) ?? 0);
                                var month = (int)(monthProp.GetValue(val) ?? 0);
                                var day = (int)(dayProp.GetValue(val) ?? 0);
                                
                                if (year > 1)
                                {
                                    dict[fieldName] = $"{year}-{month:D2}-{day:D2}";
                                }
                                else
                                {
                                    dict[fieldName] = null;
                                }
                            }
                            else
                            {
                                dict[fieldName] = null;
                            }
                        }
                        else
                        {
                            // Fallback: try GetDateTime method
                            var getDateTimeMethod = type.GetMethod("GetDateTime");
                            if (getDateTimeMethod != null)
                            {
                                var dateTimeVal = (DateTime?)getDateTimeMethod.Invoke(val, null);
                                if (dateTimeVal.HasValue && dateTimeVal.Value.Year > 1)
                                {
                                    dict[fieldName] = dateTimeVal.Value.ToString("yyyy-MM-dd");
                                }
                                else
                                {
                                    dict[fieldName] = null;
                                }
                            }
                            else
                            {
                                dict[fieldName] = null;
                            }
                        }
                        continue;
                    }
                    catch (Exception mysqlEx)
                    {
                        Console.WriteLine($"⚠ Warning: Could not convert MySqlDateTime for field {fieldName}: {mysqlEx.Message}");
                        dict[fieldName] = null;
                        continue;
                    }
                }
                
                // Convert MySQL date types to strings for JSON serialization
                if (val is DateTime dt)
                {
                    if (dt.Year <= 1)
                    {
                        dict[fieldName] = null;
                    }
                    else
                    {
                        dict[fieldName] = dt.ToString("yyyy-MM-dd");
                    }
                }
                else if (val is DateOnly dateOnly)
                {
                    if (dateOnly.Year <= 1)
                    {
                        dict[fieldName] = null;
                    }
                    else
                    {
                        dict[fieldName] = dateOnly.ToString("yyyy-MM-dd");
                    }
                }
                else if (val is bool boolVal)
                {
                    dict[fieldName] = boolVal;
                }
                else if (val is sbyte || val is byte || val is short || val is ushort || 
                         val is int || val is uint || val is long || val is ulong)
                {
                    // Handle all integer types
                    dict[fieldName] = Convert.ToInt64(val);
                }
                else if (val is float || val is double || val is decimal)
                {
                    // Handle floating point types
                    dict[fieldName] = Convert.ToDouble(val);
                }
                else
                {
                    // For strings and other types, use as-is
                    dict[fieldName] = val;
                }
            }
            
            Console.WriteLine($"✓ Plan {id} retrieved successfully");
            return JsonSerializer.Serialize(dict);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching plan {id}: {ex.Number} - {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return null;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching plan {id}: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return null;
        }
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
            
            // 1. Get plan details to know the date range and target
            using var planCmd = conn.CreateCommand();
            planCmd.CommandText = "SELECT start_date, end_date, total_word_count, algorithm_type, weekend_approach FROM plans WHERE id=@pid AND user_id=@uid LIMIT 1";
            planCmd.Parameters.AddWithValue("@pid", planId);
            planCmd.Parameters.AddWithValue("@uid", userId);
            
            DateTime startDate = DateTime.MinValue, endDate = DateTime.MinValue;
            int totalGoal = 0;
            string algorithm = "steady", weekendApproach = "The Usual";
            bool planFound = false;

            using (var planReader = planCmd.ExecuteReader())
            {
                if (planReader.Read())
                {
                    startDate = planReader.GetDateTime("start_date");
                    endDate = planReader.GetDateTime("end_date");
                    totalGoal = planReader.GetInt32("total_word_count");
                    algorithm = planReader.IsDBNull(planReader.GetOrdinal("algorithm_type")) ? "steady" : planReader.GetString("algorithm_type");
                    weekendApproach = planReader.IsDBNull(planReader.GetOrdinal("weekend_approach")) ? "The Usual" : planReader.GetString("weekend_approach");
                    planFound = true;
                }
            }
            
            if (!planFound)
            {
                Console.WriteLine($"✗ Plan {planId} not found or doesn't belong to user {userId}");
                return "[]";
            }
            
            // 2. Get logged logs from plan_days
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id, date, target_count, actual_count, notes
                FROM plan_days
                WHERE plan_id = @pid
                ORDER BY date ASC";
            cmd.Parameters.AddWithValue("@pid", planId);
            
            var loggedDays = new Dictionary<string, (int id, int target, int actual, string? notes)>();
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    var d = reader.GetDateTime(1).ToString("yyyy-MM-dd");
                    loggedDays[d] = (
                        reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
                        reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                        reader.IsDBNull(3) ? 0 : reader.GetInt32(3),
                        reader.IsDBNull(4) ? (string?)null : reader.GetString(4)
                    );
                }
            }
            
            // 3. Generate full schedule from start to end
            var days = new List<Dictionary<string, object>>();
            int totalDaysCount = (int)(endDate - startDate).TotalDays + 1;
            if (totalDaysCount <= 0 || totalDaysCount > 1000) // Safety sanity check
            {
                 // If dates are weird, Fallback to just returning logged days
                 return JsonSerializer.Serialize(loggedDays.Select(kv => new Dictionary<string, object> {
                     ["id"] = kv.Value.id,
                     ["date"] = kv.Key,
                     ["target_count"] = kv.Value.target,
                     ["actual_count"] = kv.Value.actual,
                     ["notes"] = kv.Value.notes ?? (object)DBNull.Value
                 }).ToList());
            }

            // CRITICAL FIX: After RegeneratePlanDays runs, ALL days in the date range should have
            // target_count values stored in the database. We should ONLY use stored values and
            // NEVER recalculate, as recalculation would override the algorithm-based distribution.
            
            Console.WriteLine($"📊 Found {loggedDays.Count} stored plan_days in database for plan {planId} (expecting ~{totalDaysCount} days)");
            
            // Check if plan_days are missing or incomplete - if so, trigger regeneration
            // Count how many days in the date range have stored values
            int daysWithStoredValues = 0;
            for (int i = 0; i < totalDaysCount; i++)
            {
                var currDate = startDate.AddDays(i);
                var dateKey = currDate.ToString("yyyy-MM-dd");
                if (loggedDays.ContainsKey(dateKey))
                {
                    daysWithStoredValues++;
                }
            }
            
            // If less than 80% of days have stored values, regenerate (handles old plans or incomplete data)
            bool needsRegeneration = daysWithStoredValues < (totalDaysCount * 0.8);
            if (needsRegeneration && loggedDays.Count > 0) // Only if we have SOME data (not a brand new plan)
                {
                Console.WriteLine($"⚠ Warning: Only {daysWithStoredValues}/{totalDaysCount} days have stored values. Triggering regeneration...");
                try
                {
                    // Get strategy_intensity from plan
                    string? strategyIntensity = "Average";
                    using (var intensityCmd = conn.CreateCommand())
                    {
                        intensityCmd.CommandText = "SELECT strategy_intensity FROM plans WHERE id = @pid";
                        intensityCmd.Parameters.AddWithValue("@pid", planId);
                        var intensityResult = intensityCmd.ExecuteScalar();
                        if (intensityResult != null && intensityResult != DBNull.Value)
            {
                            strategyIntensity = intensityResult.ToString();
                        }
                    }
                    
                    RegeneratePlanDays(planId, totalGoal, startDate.ToString("yyyy-MM-dd"), endDate.ToString("yyyy-MM-dd"), algorithm, strategyIntensity, weekendApproach, conn);
                
                    // Re-fetch loggedDays after regeneration
                    loggedDays.Clear();
                    using (var refetchCmd = conn.CreateCommand())
                    {
                        refetchCmd.CommandText = @"
                            SELECT id, date, target_count, actual_count, notes
                            FROM plan_days
                            WHERE plan_id = @pid
                            ORDER BY date ASC";
                        refetchCmd.Parameters.AddWithValue("@pid", planId);
                        using (var refetchReader = refetchCmd.ExecuteReader())
                {
                            while (refetchReader.Read())
                            {
                                var d = refetchReader.GetDateTime(1).ToString("yyyy-MM-dd");
                                loggedDays[d] = (
                                    refetchReader.IsDBNull(0) ? 0 : refetchReader.GetInt32(0),
                                    refetchReader.IsDBNull(2) ? 0 : refetchReader.GetInt32(2),
                                    refetchReader.IsDBNull(3) ? 0 : refetchReader.GetInt32(3),
                                    refetchReader.IsDBNull(4) ? (string?)null : refetchReader.GetString(4)
                                );
                }
                        }
                    }
                    Console.WriteLine($"✅ Regenerated plan_days. Now have {loggedDays.Count} stored days.");
                }
                catch (Exception regenEx)
                {
                    Console.WriteLine($"⚠ Warning: Could not auto-regenerate plan_days: {regenEx.Message}");
                    // Continue with existing data
                }
            }
            
            for (int i = 0; i < totalDaysCount; i++)
                    {
                var currDate = startDate.AddDays(i);
                var dateKey = currDate.ToString("yyyy-MM-dd");

                int actualCount = 0;
                string? notes = null;
                int dayId = 0;
                int targetCount = 0;
                
                // ALWAYS use stored values from database - RegeneratePlanDays ensures all days are stored
                if (loggedDays.ContainsKey(dateKey))
                {
                    var logged = loggedDays[dateKey];
                    dayId = logged.id;
                    actualCount = logged.actual;
                    notes = logged.notes;
                    targetCount = logged.target; // Use stored target_count - this is the source of truth
                }
                else
                {
                    // Day doesn't exist in database - return 0 target
                    // This should be rare after RegeneratePlanDays, but can happen for edge cases
                    Console.WriteLine($"⚠ Day {dateKey} not found in plan_days. Returning target_count = 0.");
                    targetCount = 0;
                }

                days.Add(new Dictionary<string, object>
                {
                    ["id"] = dayId,
                    ["date"] = dateKey,
                    ["target_count"] = targetCount,
                    ["actual_count"] = actualCount,
                    ["notes"] = notes ?? (object)DBNull.Value
                });
            }
            
            // 4. Add any logged days that fall outside the plan's date range
            // This ensures that progress logged for dates outside the plan range is still included
            foreach (var loggedDay in loggedDays)
            {
                var loggedDateKey = loggedDay.Key;
                
                // Try to parse the date safely
                if (DateTime.TryParse(loggedDateKey, out var loggedDate))
                {
                    // Check if this date is outside the plan's date range
                    if (loggedDate < startDate || loggedDate > endDate)
                    {
                        // Add this logged day to the results
                        days.Add(new Dictionary<string, object>
                        {
                            ["id"] = loggedDay.Value.id,
                            ["date"] = loggedDateKey,
                            ["target_count"] = 0, // No target for days outside plan range
                            ["actual_count"] = loggedDay.Value.actual,
                            ["notes"] = loggedDay.Value.notes ?? (object)DBNull.Value
                        });
                    }
                }
                else
                {
                    // If date parsing fails, log a warning but don't crash
                    Console.WriteLine($"⚠ Warning: Could not parse date '{loggedDateKey}' for plan {planId}");
                }
            }
            
            // Sort all days by date to maintain chronological order
            days = days.OrderBy(d => d["date"].ToString()).ToList();
            
            Console.WriteLine($"✓ Generated {days.Count} days for plan {planId} (respecting approach: {weekendApproach}, including days outside range)");
            return JsonSerializer.Serialize(days);
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching plan days: {ex.Message}");
            return "[]";
        }
    }
    public string GetCalendarPlansJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📋 Fetching calendar plans with daily logs for user {userId}");
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();

            // 1. Fetch all active plans
            var plans = new List<Dictionary<string, object?>>();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
                    SELECT p.*
                    FROM plans p 
                    WHERE p.user_id=@u 
                    AND (p.status IS NULL OR LOWER(p.status) != 'archived')
                    ORDER BY p.id DESC";
                cmd.Parameters.AddWithValue("@u", userId);
                
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    var dict = new Dictionary<string, object?>();
                    for (var i = 0; i < reader.FieldCount; i++)
                    {
                        var fieldName = reader.GetName(i);
                        if (reader.IsDBNull(i))
                        {
                            dict[fieldName] = null;
                            continue;
                        }
                        
                        var val = reader.GetValue(i);
                        
                        // Handle date/time conversion
                        if (val is DateTime dt)
                        {
                             dict[fieldName] = dt.Year > 1 ? dt.ToString("yyyy-MM-dd") : null;
                        }
                        else if (val is DateOnly d)
                        {
                            dict[fieldName] = d.Year > 1 ? d.ToString("yyyy-MM-dd") : null;
                        }
                        else
                        {
                             dict[fieldName] = val;
                        }
                    }
                    // Initialize empty days list
                    dict["days"] = new List<Dictionary<string, object>>();
                    plans.Add(dict);
                }
            }
            
            if (plans.Count == 0)
            {
                 return "[]";
            }
            
            // 2. Fetch all daily logs for these plans in one query
            // We use the IN clause with the plan IDs
            var planIds = plans.Select(p => Convert.ToInt32(p["id"])).ToList();
            if (planIds.Count > 0)
            {
                var planIdString = string.Join(",", planIds);
                using (var daysCmd = conn.CreateCommand())
                {
                    daysCmd.CommandText = $@"
                        SELECT plan_id, date, target_count, actual_count, notes
                        FROM plan_days
                        WHERE plan_id IN ({planIdString})
                        ORDER BY date ASC";
                        
                    using var reader = daysCmd.ExecuteReader();
                    while (reader.Read())
                    {
                        int planId = reader.GetInt32(0);
                        
                        string dateStr = "";
                        if (!reader.IsDBNull(1))
                        {
                             var dateVal = reader.GetValue(1);
                             if (dateVal is DateTime dt) dateStr = dt.ToString("yyyy-MM-dd");
                             else if (dateVal is DateOnly doxy) dateStr = doxy.ToString("yyyy-MM-dd");
                             else dateStr = dateVal.ToString();
                        }
                        
                        var dayDict = new Dictionary<string, object>
                        {
                            ["plan_id"] = planId,
                            ["date"] = dateStr,
                            ["target_count"] = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                            ["actual_count"] = reader.IsDBNull(3) ? 0 : reader.GetInt32(3),
                            ["notes"] = reader.IsDBNull(4) ? null : reader.GetString(4)
                        };
                        
                        // Find the matching plan and add the day
                        var plan = plans.FirstOrDefault(p => Convert.ToInt32(p["id"]) == planId);
                        if (plan != null)
                        {
                            var daysList = (List<Dictionary<string, object>>)plan["days"];
                            daysList.Add(dayDict);
                        }
                    }
                }
            }
            
            Console.WriteLine($"✓ Retrieved {plans.Count} calendar plans with embedded logs");
            return JsonSerializer.Serialize(plans);
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching calendar plans: {ex.Message}");
            return "[]";
        }
    }

    public bool LogPlanProgress(int planId, int userId, string date, int actualCount, string? notes, int? targetCount = null, bool skipProgressRecalculation = false)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📝 Logging progress for plan {planId}, user {userId}, date {date}: {actualCount} words, target: {targetCount ?? 0}");
            
            // Validate date format
            if (!DateTime.TryParse(date, out var parsedDate))
            {
                _lastError = $"Invalid date format: {date}";
                Console.WriteLine($"✗ {_lastError}");
                return false;
            }
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Verify plan belongs to user
            using (var verifyCmd = conn.CreateCommand())
            {
                verifyCmd.CommandText = "SELECT COUNT(*) FROM plans WHERE id=@pid AND user_id=@uid";
                verifyCmd.Parameters.AddWithValue("@pid", planId);
                verifyCmd.Parameters.AddWithValue("@uid", userId);
                if (Convert.ToInt32(verifyCmd.ExecuteScalar()) == 0)
                {
                    _lastError = "Plan not found or access denied";
                    Console.WriteLine($"✗ {_lastError}");
                    return false;
                }
            }

            // Get existing values to preserve them when updating
            int existingActualCount = 0;
            int existingTargetCount = 0;
            using (var getExistingCmd = conn.CreateCommand())
                {
                getExistingCmd.CommandText = "SELECT actual_count, target_count FROM plan_days WHERE plan_id = @pid AND date = @date";
                getExistingCmd.Parameters.AddWithValue("@pid", planId);
                getExistingCmd.Parameters.AddWithValue("@date", parsedDate.ToString("yyyy-MM-dd"));
                using var reader = getExistingCmd.ExecuteReader();
                if (reader.Read())
                {
                    existingActualCount = reader.IsDBNull(0) ? 0 : reader.GetInt32(0);
                    existingTargetCount = reader.IsDBNull(1) ? 0 : reader.GetInt32(1);
                }
            }

            using var cmd = conn.CreateCommand();
            
            // Determine which values to use: provided values take precedence, otherwise preserve existing
            int finalActualCount = actualCount; // Use provided value
            int finalTargetCount = targetCount ?? existingTargetCount; // Use provided target or preserve existing
            
            // If actualCount is 0 and we have existing actual_count, preserve it (don't overwrite with 0)
            // UNLESS we're also providing targetCount - in that case, we're doing a full update and should respect the 0
            // This handles:
            // 1. "Only updating target_count" - preserve existing actual_count
            // 2. "Explicitly setting actual_count to 0" (e.g., when reducing progress) - overwrite it
            if (actualCount == 0 && existingActualCount > 0 && !targetCount.HasValue)
            {
                // Preserve existing actual_count only if we're NOT providing target_count
                // (meaning we're only updating target_count, not doing a full update)
                finalActualCount = existingActualCount;
                Console.WriteLine($"ℹ Preserving existing actual_count ({existingActualCount}) because actualCount is 0 and no targetCount provided");
            }
            else if (actualCount == 0 && existingActualCount > 0 && targetCount.HasValue)
            {
                // Explicitly setting actual_count to 0 when both actualCount and targetCount are provided
                // This allows clearing actual_count when reducing progress
                Console.WriteLine($"✓ Setting actual_count to 0 (was {existingActualCount}) because both actualCount and targetCount are provided");
            }

            // Always update target_count if provided, otherwise use existing
            if (targetCount.HasValue)
            {
                // When updating target_count, preserve existing notes if notes parameter is null/empty
                // This prevents notes from being overwritten when only target_count is being updated
                if (string.IsNullOrWhiteSpace(notes))
                {
                    // Don't update notes - preserve existing value
                    // Don't include notes in UPDATE clause, so existing notes are preserved
                    cmd.CommandText = @"
                        INSERT INTO plan_days (plan_id, date, actual_count, notes, target_count)
                        VALUES (@pid, @date, @count, NULL, @target)
                        ON DUPLICATE KEY UPDATE 
                            actual_count = @count,
                            target_count = @target";
                    // notes is not in UPDATE clause, so existing notes are preserved
                }
                else
                {
                    // Update notes if explicitly provided
                    cmd.CommandText = @"
                        INSERT INTO plan_days (plan_id, date, actual_count, notes, target_count)
                        VALUES (@pid, @date, @count, @notes, @target)
                        ON DUPLICATE KEY UPDATE 
                            actual_count = @count,
                            notes = @notes,
                            target_count = @target";
                }
            }
            else
            {
                // Only update actual_count and notes, preserve existing target_count
                cmd.CommandText = @"
                    INSERT INTO plan_days (plan_id, date, actual_count, notes, target_count)
                    VALUES (@pid, @date, @count, @notes, @target)
                    ON DUPLICATE KEY UPDATE 
                        actual_count = @count,
                        notes = @notes";
            }
            
            cmd.Parameters.AddWithValue("@pid", planId);
            cmd.Parameters.AddWithValue("@date", parsedDate.ToString("yyyy-MM-dd")); // Ensure consistent date format
            cmd.Parameters.AddWithValue("@count", finalActualCount);
            // Always add notes parameter (needed for INSERT clause)
            // When notes is empty and targetCount is provided, we don't include notes in UPDATE clause to preserve existing
            if (targetCount.HasValue && string.IsNullOrWhiteSpace(notes))
            {
                // Add NULL parameter for INSERT (will not affect UPDATE since notes isn't in UPDATE clause)
                cmd.Parameters.AddWithValue("@notes", DBNull.Value);
            }
            else
            {
                // Add notes parameter normally
                cmd.Parameters.AddWithValue("@notes", notes ?? (object)DBNull.Value);
            }
            cmd.Parameters.AddWithValue("@target", finalTargetCount);
            
            cmd.ExecuteNonQuery();
            Console.WriteLine($"✓ Successfully logged progress for plan {planId}, date {date}");
            
            // Skip progress recalculation if requested (e.g., during batch updates)
            if (skipProgressRecalculation)
            {
                Console.WriteLine($"ℹ Skipping progress recalculation for plan {planId} (batch update mode)");
                Console.WriteLine("✅ Progress logged successfully");
                return true;
            }
            
            // Recalculate and update progress percentage based on total words logged
            // Use separate command objects for each operation to avoid "Failed to read the result set" errors
            int totalWordCount = 0;
            string currentStatus = "active";
            
            // Get total word count and current status for the plan
            using (var getPlanCmd = conn.CreateCommand())
            {
                getPlanCmd.CommandText = "SELECT total_word_count, COALESCE(status, 'active') as status FROM plans WHERE id=@pid";
                getPlanCmd.Parameters.AddWithValue("@pid", planId);
                using var reader = getPlanCmd.ExecuteReader();
                if (reader.Read())
                {
                    totalWordCount = reader.GetInt32("total_word_count");
                    var statusOrdinal = reader.GetOrdinal("status");
                    currentStatus = reader.IsDBNull(statusOrdinal) ? "active" : reader.GetString(statusOrdinal);
                }
            }
            
            if (totalWordCount > 0)
            {
                // Calculate total words logged from all plan_days - use separate command
                int totalLogged = 0;
                using (var sumCmd = conn.CreateCommand())
                {
                    sumCmd.CommandText = @"
                        SELECT COALESCE(SUM(actual_count), 0) 
                        FROM plan_days 
                        WHERE plan_id=@pid AND actual_count > 0";
                    sumCmd.Parameters.AddWithValue("@pid", planId);
                    var result = sumCmd.ExecuteScalar();
                    totalLogged = result != null && result != DBNull.Value ? Convert.ToInt32(result) : 0;
                }
                
                // Calculate progress percentage
                var progressPercentage = Math.Min(100, Math.Max(0, (int)Math.Round((double)totalLogged / totalWordCount * 100)));
                
                // Determine status based on progress
                // Only update to completed if not already archived
                string newStatus = currentStatus;
                if (progressPercentage >= 100 && currentStatus?.ToLower() != "archived")
                {
                    newStatus = "completed";
                    Console.WriteLine($"🎉 Plan {planId} reached 100% progress! Marking as completed.");
                }
                else if (progressPercentage < 100 && currentStatus?.ToLower() == "completed")
                {
                    // If progress drops below 100%, change back to active
                    newStatus = "active";
                    Console.WriteLine($"📝 Plan {planId} progress dropped below 100%, changing back to active.");
                }
                
                // Update current_progress and status in plans table - use separate command
                using (var updateCmd = conn.CreateCommand())
                {
                    updateCmd.CommandText = "UPDATE plans SET current_progress = @progress, status = @status WHERE id=@pid";
                    updateCmd.Parameters.AddWithValue("@pid", planId);
                    updateCmd.Parameters.AddWithValue("@progress", progressPercentage);
                    updateCmd.Parameters.AddWithValue("@status", newStatus);
                    updateCmd.ExecuteNonQuery();
                }
                
                Console.WriteLine($"📊 Updated progress percentage: {progressPercentage}% (Total logged: {totalLogged} / Target: {totalWordCount}), Status: {newStatus}");
            }
            
            Console.WriteLine("✅ Progress logged successfully");
            return true;
        }
        catch (Exception ex)
        {
            _lastError = $"Error logging progress: {ex.Message}";
            Console.WriteLine($"✗ Error logging progress: {ex.Message}");
            return false;
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
            cmd.CommandText = @"INSERT INTO checklists (user_id,plan_id,name,is_archived) VALUES (@u,@p,@n,0); SELECT LAST_INSERT_ID();";
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
                cmd.CommandText = @"INSERT INTO checklists (user_id,plan_id,name,is_archived) VALUES (@u,@p,@n,0); SELECT LAST_INSERT_ID();";
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
                            // Parse booleans robustly (Check both snake_case and PascalCase)
                            bool isCompleted = false;
                            Func<JsonElement, bool> parseBool = (prop) => 
                                prop.ValueKind == JsonValueKind.True || 
                                (prop.ValueKind == JsonValueKind.Number && prop.GetInt32() != 0) ||
                                (prop.ValueKind == JsonValueKind.String && (prop.GetString()?.ToLower() == "true" || prop.GetString() == "1"));

                            if (item.TryGetProperty("is_done", out var doneProp) || item.TryGetProperty("Is_done", out doneProp)) isCompleted |= parseBool(doneProp);
                            if (item.TryGetProperty("is_completed", out var compProp) || item.TryGetProperty("Is_completed", out compProp)) isCompleted |= parseBool(compProp);
                            if (item.TryGetProperty("checked", out var checkedProp) || item.TryGetProperty("Checked", out checkedProp)) isCompleted |= parseBool(checkedProp);

                            using var itemCmd = conn.CreateCommand();
                            itemCmd.Transaction = transaction;
                            itemCmd.CommandText = @"INSERT INTO checklist_items (checklist_id,content,sort_order,is_completed) VALUES (@c,@x,@s,@d)";
                            itemCmd.Parameters.AddWithValue("@c", checklistId);
                            itemCmd.Parameters.AddWithValue("@x", content);
                            itemCmd.Parameters.AddWithValue("@s", sortOrder++);
                            itemCmd.Parameters.AddWithValue("@d", isCompleted);
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
                (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id AND is_completed = 1) as completed_count
                FROM checklists c 
                WHERE c.user_id = @u AND (c.is_archived IS NULL OR c.is_archived = 0)
                ORDER BY c.created_at DESC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var checklists = new List<Dictionary<string, object>>();
            
                while (reader.Read())
                {
                    var checklist = new Dictionary<string, object>();
                    
                    // Add all columns from reader
                    for (var i = 0; i < reader.FieldCount; i++)
                    {
                        var fieldName = reader.GetName(i);
                        if (reader.IsDBNull(i))
                        {
                            checklist[fieldName] = null!;
                            continue;
                        }
                        
                        var val = reader.GetValue(i);
                        if (val is DateTime dt) checklist[fieldName] = dt.ToString("yyyy-MM-ddTHH:mm:ss");
                        else if (val is DateOnly do1) checklist[fieldName] = do1.ToString("yyyy-MM-dd");
                        else checklist[fieldName] = val;
                    }
                    
                    int checklistId = Convert.ToInt32(reader[reader.GetOrdinal("id")]);
                    
                    // Fetch items for this checklist
                    using var itemsConn = new MySqlConnection(_connectionString);
                    itemsConn.Open();
                    using var itemsCmd = itemsConn.CreateCommand();
                    itemsCmd.CommandText = "SELECT id, content, is_completed, sort_order FROM checklist_items WHERE checklist_id = @cid ORDER BY sort_order ASC, id ASC";
                    itemsCmd.Parameters.AddWithValue("@cid", checklistId);
                    
                    using var itemsReader = itemsCmd.ExecuteReader();
                    var items = new List<Dictionary<string, object>>();
                    
                    var colId = itemsReader.GetOrdinal("id");
                    var colContent = itemsReader.GetOrdinal("content");
                    var colCompleted = itemsReader.GetOrdinal("is_completed");
                    var colSort = itemsReader.GetOrdinal("sort_order");

                    while (itemsReader.Read())
                    {
                        var content = itemsReader.IsDBNull(colContent) ? "" : itemsReader.GetString(colContent);
                        var isCompleted = itemsReader.IsDBNull(colCompleted) ? false : itemsReader.GetBoolean(colCompleted);
                        
                        items.Add(new Dictionary<string, object>
                        {
                            ["id"] = itemsReader.GetInt32(colId),
                            ["text"] = content,
                            ["content"] = content,
                            ["checked"] = isCompleted,
                            ["is_done"] = isCompleted,
                            ["is_completed"] = isCompleted,
                            ["sort_order"] = itemsReader.GetInt32(colSort)
                        });
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
                (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id AND is_completed = 1) as completed_count
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
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var fieldName = reader.GetName(i);
                if (reader.IsDBNull(i)) { checklist[fieldName] = null!; continue; }
                var val = reader.GetValue(i);
                if (val is DateTime dt) checklist[fieldName] = dt.ToString("yyyy-MM-ddTHH:mm:ss");
                else if (val is DateOnly do2) checklist[fieldName] = do2.ToString("yyyy-MM-dd");
                else checklist[fieldName] = val;
            }

            int checklistId = Convert.ToInt32(reader[reader.GetOrdinal("id")]);
            
            // Fetch items for this checklist
            using var itemsConn = new MySqlConnection(_connectionString);
            itemsConn.Open();
            using var itemsCmd = itemsConn.CreateCommand();
            itemsCmd.CommandText = "SELECT id, content, is_completed, sort_order FROM checklist_items WHERE checklist_id = @cid ORDER BY sort_order ASC, id ASC";
            itemsCmd.Parameters.AddWithValue("@cid", checklistId);
            
            using var itemsReader = itemsCmd.ExecuteReader();
            var items = new List<Dictionary<string, object>>();
            var cId = itemsReader.GetOrdinal("id");
            var cContent = itemsReader.GetOrdinal("content");
            var cCompleted = itemsReader.GetOrdinal("is_completed");
            var cSort = itemsReader.GetOrdinal("sort_order");

            while (itemsReader.Read())
            {
                var content = itemsReader.IsDBNull(cContent) ? "" : itemsReader.GetString(cContent);
                var isCompleted = itemsReader.IsDBNull(cCompleted) ? false : itemsReader.GetBoolean(cCompleted);
                
                items.Add(new Dictionary<string, object>
                {
                    ["id"] = itemsReader.GetInt32(cId),
                    ["text"] = content,
                    ["content"] = content,
                    ["checked"] = isCompleted,
                    ["is_done"] = isCompleted,
                    ["is_completed"] = isCompleted,
                    ["sort_order"] = itemsReader.GetInt32(cSort)
                });
            }
            
            checklist["items"] = items;
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

    public bool UpdateChecklist(int id, int userId, int? planId, string name, System.Text.Json.JsonElement[]? items)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🔌 Updating checklist {id} for user {userId} (Plan ID: {planId})");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var transaction = conn.BeginTransaction();
            
            try
            {
                // Update checklist header (name and plan_id)
                using var cmd = conn.CreateCommand();
                cmd.Transaction = transaction;
                // We use id and user_id to ensure ownership
                cmd.CommandText = "UPDATE checklists SET name=@n, plan_id=@p WHERE id=@id AND user_id=@u";
                cmd.Parameters.AddWithValue("@n", name);
                cmd.Parameters.AddWithValue("@p", planId ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@u", userId);
                
                var rowsAffected = cmd.ExecuteNonQuery();
                
                // In MySQL, rowsAffected is 0 if nothing changed. 
                // We need to verify if the checklist actually exists for this user.
                if (rowsAffected == 0)
                {
                    using var checkCmd = conn.CreateCommand();
                    checkCmd.Transaction = transaction;
                    checkCmd.CommandText = "SELECT COUNT(*) FROM checklists WHERE id=@id AND user_id=@u";
                    checkCmd.Parameters.AddWithValue("@id", id);
                    checkCmd.Parameters.AddWithValue("@u", userId);
                    
                    var exists = Convert.ToInt32(checkCmd.ExecuteScalar()) > 0;
                    if (!exists)
                    {
                        transaction.Rollback();
                        _lastError = "Checklist not found or you don't have permission to update it";
                        Console.WriteLine($"✗ Checklist {id} not found or permission denied for user {userId}");
                        return false;
                    }
                    Console.WriteLine($"✓ Checklist {id} exists but no header changes were needed");
                }
                else
                {
                    Console.WriteLine($"✓ Updated checklist {id} header");
                }
                
                // Get existing item IDs to determine deletions
                var existingIds = new HashSet<int>();
                using (var getIdsCmd = conn.CreateCommand()) 
                {
                    getIdsCmd.Transaction = transaction;
                    getIdsCmd.CommandText = "SELECT id FROM checklist_items WHERE checklist_id=@id";
                    getIdsCmd.Parameters.AddWithValue("@id", id);
                    using var reader = getIdsCmd.ExecuteReader();
                    while (reader.Read()) existingIds.Add(reader.GetInt32("id"));
                }

                var processedIds = new HashSet<int>();
                
                // Process items (Upsert)
                if (items != null && items.Length > 0)
                {
                    int sortOrder = 0;
                    foreach (var item in items)
                    {
                        // Parse content (Check both snake_case and PascalCase)
                        string? content = null;
                        if (item.TryGetProperty("text", out var textProp) || item.TryGetProperty("Text", out textProp)) content = textProp.GetString();
                        else if (item.TryGetProperty("content", out var contentProp) || item.TryGetProperty("Content", out contentProp)) content = contentProp.GetString();
                        
                        // Parse is_done/is_completed/checked (Robust check across all possible names and casings)
                        bool isCompleted = false;
                        Func<JsonElement, bool> parseBool = (prop) => 
                            prop.ValueKind == JsonValueKind.True || 
                            (prop.ValueKind == JsonValueKind.Number && prop.GetInt32() != 0) ||
                            (prop.ValueKind == JsonValueKind.String && (prop.GetString()?.ToLower() == "true" || prop.GetString() == "1"));

                        // Priority order: checked > is_done > is_completed
                        if (item.TryGetProperty("checked", out var checkedProp) || item.TryGetProperty("Checked", out checkedProp)) 
                            isCompleted = parseBool(checkedProp);
                        else if (item.TryGetProperty("is_done", out var doneProp) || item.TryGetProperty("Is_done", out doneProp)) 
                            isCompleted = parseBool(doneProp);
                        else if (item.TryGetProperty("is_completed", out var compProp) || item.TryGetProperty("Is_completed", out compProp)) 
                            isCompleted = parseBool(compProp);

                        // Check for ID with string fallback (Check both cases)
                        int itemId = 0;
                        JsonElement idProp;
                        if (item.TryGetProperty("id", out idProp) || item.TryGetProperty("Id", out idProp))
                        {
                            if (idProp.ValueKind == JsonValueKind.Number) itemId = idProp.GetInt32();
                            else if (idProp.ValueKind == JsonValueKind.String && int.TryParse(idProp.GetString(), out var sid)) itemId = sid;
                        }

                        if (!string.IsNullOrWhiteSpace(content))
                        {
                            if (itemId > 0 && existingIds.Contains(itemId))
                            {
                                // Update existing
                                using var updateCmd = conn.CreateCommand();
                                updateCmd.Transaction = transaction;
                                updateCmd.CommandText = "UPDATE checklist_items SET content=@x, sort_order=@s, is_completed=@d WHERE id=@id AND checklist_id=@c";
                                updateCmd.Parameters.AddWithValue("@x", content);
                                updateCmd.Parameters.AddWithValue("@s", sortOrder++);
                                updateCmd.Parameters.AddWithValue("@d", isCompleted);
                                updateCmd.Parameters.AddWithValue("@id", itemId);
                                updateCmd.Parameters.AddWithValue("@c", id);
                                updateCmd.ExecuteNonQuery();
                                processedIds.Add(itemId);
                            }
                            else
                            {
                                // Insert new
                                using var insertCmd = conn.CreateCommand();
                                insertCmd.Transaction = transaction;
                                insertCmd.CommandText = "INSERT INTO checklist_items (checklist_id,content,sort_order,is_completed) VALUES (@c,@x,@s,@d)";
                                insertCmd.Parameters.AddWithValue("@c", id);
                                insertCmd.Parameters.AddWithValue("@x", content);
                                insertCmd.Parameters.AddWithValue("@s", sortOrder++);
                                insertCmd.Parameters.AddWithValue("@d", isCompleted);
                                insertCmd.ExecuteNonQuery();
                            }
                        }
                    }
                }
                
                // Delete removed items
                var idsToDelete = existingIds.Where(eid => !processedIds.Contains(eid)).ToList();
                if (idsToDelete.Any())
                {
                    using var delCmd = conn.CreateCommand();
                    delCmd.Transaction = transaction;
                    var idList = string.Join(",", idsToDelete);
                    delCmd.CommandText = $"DELETE FROM checklist_items WHERE id IN ({idList}) AND checklist_id=@c";
                    delCmd.Parameters.AddWithValue("@c", id);
                    delCmd.ExecuteNonQuery();
                    Console.WriteLine($"✓ Deleted {idsToDelete.Count} removed items");
                }

                transaction.Commit();
                Console.WriteLine($"✓ Checklist {id} updated successfully with Smart Sync");
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
            cmd.CommandText = "UPDATE checklist_items SET is_completed=@d WHERE id=@id";
            cmd.Parameters.AddWithValue("@d", isDone);
            cmd.Parameters.AddWithValue("@id", itemId);
            
            Console.WriteLine($"   Executing UPDATE checklist_items SET is_completed={isDone} WHERE id={itemId}");
            var rowsAffected = cmd.ExecuteNonQuery();
            
            // In MySQL, rowsAffected is 0 if nothing changed.
            if (rowsAffected == 0)
            {
                using var checkCmd = conn.CreateCommand();
                checkCmd.CommandText = "SELECT COUNT(*) FROM checklist_items WHERE id=@id";
                checkCmd.Parameters.AddWithValue("@id", itemId);
                return Convert.ToInt32(checkCmd.ExecuteScalar()) > 0;
            }
            
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

    public bool ArchiveChecklist(int id, int userId, bool isArchived)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📦 Archiving checklist {id} for user {userId}: {isArchived}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE checklists SET is_archived=@a WHERE id=@id AND user_id=@u";
            cmd.Parameters.AddWithValue("@a", isArchived);
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@u", userId);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            
            // In MySQL, rowsAffected is 0 if nothing changed.
            if (rowsAffected == 0)
            {
                using var checkCmd = conn.CreateCommand();
                checkCmd.CommandText = "SELECT COUNT(*) FROM checklists WHERE id=@id AND user_id=@u";
                checkCmd.Parameters.AddWithValue("@id", id);
                checkCmd.Parameters.AddWithValue("@u", userId);
                return Convert.ToInt32(checkCmd.ExecuteScalar()) > 0;
            }
            
            var result = rowsAffected == 1;
            
            if (result)
            {
                Console.WriteLine($"✓ Checklist {id} archived status set to {isArchived}");
            }
            else
            {
                _lastError = "Checklist not found or access denied";
                Console.WriteLine($"✗ Checklist {id} not found or access denied");
            }
            
            return result;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error archiving checklist: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error archiving checklist: {ex.Message}");
            return false;
        }
    }

    public bool ArchivePlan(int id, int userId, bool isArchived)
    {
        _lastError = string.Empty;
        try
        {
            var status = isArchived ? "archived" : "active";
            Console.WriteLine($"📦 Archiving plan {id} for user {userId}: {status}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE plans SET status=@s WHERE id=@id AND user_id=@u";
            cmd.Parameters.AddWithValue("@s", status);
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@u", userId);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            var result = rowsAffected == 1;
            
            if (result)
            {
                Console.WriteLine($"✓ Plan {id} status set to {status}");
            }
            else
            {
                _lastError = "Plan not found or access denied";
                Console.WriteLine($"✗ Plan {id} not found or access denied");
            }
            
            return result;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error archiving plan: {ex.Message}");
            return false;
        }
    }

    public bool DeleteChecklist(int id, int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"🗑️ Deleting checklist {id} for user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Start transaction to delete items first
            using var transaction = conn.BeginTransaction();
            
            try
            {
                // Delete checklist items first
                using (var itemsCmd = conn.CreateCommand())
                {
                    itemsCmd.Transaction = transaction;
                    itemsCmd.CommandText = "DELETE FROM checklist_items WHERE checklist_id=@id";
                    itemsCmd.Parameters.AddWithValue("@id", id);
                    itemsCmd.ExecuteNonQuery();
                }
                
                // Delete checklist
                using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = transaction;
                    cmd.CommandText = "DELETE FROM checklists WHERE id=@id AND user_id=@u";
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.Parameters.AddWithValue("@u", userId);
                    
                    var rowsAffected = cmd.ExecuteNonQuery();
                    if (rowsAffected == 0)
                    {
                        transaction.Rollback();
                        _lastError = "Checklist not found or access denied";
                        Console.WriteLine($"✗ Checklist {id} not found or access denied");
                        return false;
                    }
                }
                
                transaction.Commit();
                Console.WriteLine($"✓ Checklist {id} deleted successfully");
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
            Console.WriteLine($"✗ MySQL Error deleting checklist: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error deleting checklist: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Helper method to safely convert database values to JSON-serializable format
    /// Handles DateTime, DateOnly, MySqlDateTime, and other types
    /// </summary>
    private object? ConvertDbValueToJson(object? val)
    {
        if (val == null || val == DBNull.Value)
        {
            return null;
        }

        // Handle DateTime
        if (val is DateTime dt)
        {
            if (dt.Year <= 1)
            {
                return null;
            }
            return dt.ToString("yyyy-MM-ddTHH:mm:ss");
        }

        // Handle MySqlDateTime (when AllowZeroDateTime=True in connection string)
        if (val != null && val.GetType().Name == "MySqlDateTime")
        {
            try
            {
                var type = val.GetType();
                var isValidProp = type.GetProperty("IsValidDateTime");
                var yearProp = type.GetProperty("Year");
                var monthProp = type.GetProperty("Month");
                var dayProp = type.GetProperty("Day");
                var hourProp = type.GetProperty("Hour");
                var minuteProp = type.GetProperty("Minute");
                var secondProp = type.GetProperty("Second");
                
                if (isValidProp != null && yearProp != null && monthProp != null && dayProp != null)
                {
                    var isValid = (bool)(isValidProp.GetValue(val) ?? false);
                    if (isValid)
                    {
                        var year = (int)(yearProp.GetValue(val) ?? 0);
                        var month = (int)(monthProp.GetValue(val) ?? 0);
                        var day = (int)(dayProp.GetValue(val) ?? 0);
                        var hour = hourProp != null ? (int)(hourProp.GetValue(val) ?? 0) : 0;
                        var minute = minuteProp != null ? (int)(minuteProp.GetValue(val) ?? 0) : 0;
                        var second = secondProp != null ? (int)(secondProp.GetValue(val) ?? 0) : 0;
                        
                        if (year > 1)
                        {
                            return $"{year}-{month:D2}-{day:D2}T{hour:D2}:{minute:D2}:{second:D2}";
                        }
                    }
                }
                else
                {
                    // Fallback: try GetDateTime method
                    var getDateTimeMethod = type.GetMethod("GetDateTime");
                    if (getDateTimeMethod != null)
                    {
                        var dateTimeVal = (DateTime?)getDateTimeMethod.Invoke(val, null);
                        if (dateTimeVal.HasValue && dateTimeVal.Value.Year > 1)
                        {
                            return dateTimeVal.Value.ToString("yyyy-MM-ddTHH:mm:ss");
                        }
                    }
                }
                return null;
            }
            catch (Exception mysqlEx)
            {
                Console.WriteLine($"⚠ Warning: Could not convert MySqlDateTime: {mysqlEx.Message}");
                return null;
            }
        }

        // Handle DateOnly
        if (val is DateOnly dateOnly)
        {
            if (dateOnly.Year > 1)
            {
                return dateOnly.ToString("yyyy-MM-dd");
            }
            return null;
        }

        // Return other types as-is
        return val;
    }

    public string GetArchivedChecklistsJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"SELECT c.*, 
                (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id) as item_count,
                (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id AND is_completed = 1) as completed_count
                FROM checklists c 
                WHERE c.user_id = @u AND c.is_archived = 1
                ORDER BY c.created_at DESC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var checklists = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var checklist = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    if (reader.IsDBNull(i))
                    {
                        checklist[fieldName] = null!;
                        continue;
                    }
                    
                    var val = reader.GetValue(i);
                    checklist[fieldName] = ConvertDbValueToJson(val) ?? (object)null!;
                }
                checklists.Add(checklist);
            }
            
            Console.WriteLine($"✓ Retrieved {checklists.Count} archived checklists for user {userId}");
            return JsonSerializer.Serialize(checklists);
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error getting archived checklists: {ex.Message}");
            return "[]";
        }
    }

    public string GetArchivedPlansJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT * FROM plans WHERE user_id=@u AND status='archived' ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var plans = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var plan = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    if (reader.IsDBNull(i))
                    {
                        plan[fieldName] = null!;
                        continue;
                    }
                    
                    var val = reader.GetValue(i);
                    plan[fieldName] = ConvertDbValueToJson(val) ?? (object)null!;
                }
                plans.Add(plan);
            }
            
            Console.WriteLine($"✓ Retrieved {plans.Count} archived plans for user {userId}");
            return JsonSerializer.Serialize(plans);
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error getting archived plans: {ex.Message}");
            return "[]";
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
            cmd.CommandText = @"INSERT INTO challenges (user_id,title,description,type,goal_count,duration_days,start_date,end_date,is_public,invite_code,status) 
                VALUES (@u,@t,@d,@y,@g,@n,@s,@e,@p,@i,'Active'); SELECT LAST_INSERT_ID();";
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
            
            // Get daily logs for this user
            var logsJson = GetChallengeLogsJson(id, userId);
            var logsData = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(logsJson) ?? new List<Dictionary<string, object>>();
            dict["daily_logs"] = logsData;
            
            Console.WriteLine($"✓ Retrieved challenge {id} with {participantsList.Count} participants and {logsData.Count} logs");
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
            cmd.CommandText = "INSERT IGNORE INTO challenge_participants (challenge_id, user_id, current_progress, joined_at, status) VALUES (@c, @u, 0, NOW(), 'active')";
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
            cmd.CommandText = "UPDATE challenge_participants SET current_progress = current_progress + @p WHERE challenge_id = @c AND user_id = @u";
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

    public bool LogChallengeProgress(int challengeId, int userId, string date, int wordCount)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📝 Logging progress for user {userId} in challenge {challengeId} on {date}: {wordCount} words");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO challenge_logs (challenge_id, user_id, log_date, word_count)
                VALUES (@c, @u, @d, @w)
                ON DUPLICATE KEY UPDATE word_count = word_count + @w, updated_at = CURRENT_TIMESTAMP";
            cmd.Parameters.AddWithValue("@c", challengeId);
            cmd.Parameters.AddWithValue("@u", userId);
            cmd.Parameters.AddWithValue("@d", date);
            cmd.Parameters.AddWithValue("@w", wordCount);
            
            var result = cmd.ExecuteNonQuery();
            Console.WriteLine($"✓ Progress logged for user {userId} in challenge {challengeId} on {date}");
            return result > 0;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error logging progress: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error logging progress: {ex.Message}");
            return false;
        }
    }

    public string GetChallengeLogsJson(int challengeId, int userId)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📋 Fetching challenge logs for challenge {challengeId}, user {userId}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT log_date, word_count
                FROM challenge_logs
                WHERE challenge_id = @c AND user_id = @u
                ORDER BY log_date DESC";
            cmd.Parameters.AddWithValue("@c", challengeId);
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var logs = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var logDate = reader.GetDateTime("log_date").ToString("yyyy-MM-dd");
                var wordCount = reader.GetInt32("word_count");
                
                logs.Add(new Dictionary<string, object>
                {
                    ["log_date"] = logDate,
                    ["word_count"] = wordCount
                });
            }
            
            Console.WriteLine($"✓ Retrieved {logs.Count} challenge logs");
            return System.Text.Json.JsonSerializer.Serialize(logs);
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error fetching challenge logs: {ex.Number} - {ex.Message}");
            return "[]";
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error fetching challenge logs: {ex.Message}");
            return "[]";
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
            
            // Total Plans - count all visible plans (excluding archived) for the user
            cmd.CommandText = "SELECT COUNT(*) FROM plans WHERE user_id=@u AND (status IS NULL OR status != 'archived')";
            var totalPlans = Convert.ToInt32(cmd.ExecuteScalar());
            
            // Active Plans - include active and completed plans, exclude archived
            cmd.CommandText = @"SELECT COUNT(*) FROM plans 
                               WHERE user_id=@u 
                               AND COALESCE(status, 'active') != 'archived'";
            var activePlans = Convert.ToInt32(cmd.ExecuteScalar());
            
            // Total Words - sum of total_word_count from all plans
            cmd.CommandText = "SELECT COALESCE(SUM(total_word_count), 0) FROM plans WHERE user_id=@u";
            var totalWords = Convert.ToInt64(cmd.ExecuteScalar());
            
            // Completed Plans - count plans with status='completed'
            cmd.CommandText = "SELECT COUNT(*) FROM plans WHERE user_id=@u AND status='completed'";
            var completedPlans = Convert.ToInt32(cmd.ExecuteScalar());

            // Total Challenges (Joined)
            cmd.CommandText = "SELECT COUNT(*) FROM challenge_participants WHERE user_id=@u";
            var totalChallenges = Convert.ToInt32(cmd.ExecuteScalar());

            // Active Challenges (Joined & Active)
            cmd.CommandText = @"SELECT COUNT(*) 
                                FROM challenge_participants cp 
                                JOIN challenges c ON cp.challenge_id = c.id 
                                WHERE cp.user_id = @u AND c.status = 'Active'";
            var activeChallenges = Convert.ToInt32(cmd.ExecuteScalar());
            
            var obj = new 
            { 
                totalPlans, 
                activePlans, 
                totalWords, 
                completedPlans,
                totalChallenges,
                activeChallenges
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
            cmd.CommandText = @"SELECT id, username, email, bio, avatar_url, created_at 
                                FROM users 
                                WHERE id = @u";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            
            if (!reader.Read())
            {
                Console.WriteLine($"✗ User {userId} not found");
                return null;
            }
            
            // Get avatar_url, use default if null or empty
            var avatarUrl = reader.IsDBNull(reader.GetOrdinal("avatar_url")) 
                ? null 
                : reader.GetString("avatar_url");
            
            // Default avatar path (relative to wwwroot)
            var defaultAvatarUrl = string.IsNullOrWhiteSpace(avatarUrl) 
                ? "/uploads/avatars/test_avatar.png" 
                : avatarUrl;

            var profile = new Dictionary<string, object>
            {
                ["id"] = reader.GetInt32("id"),
                ["username"] = reader.GetString("username"),
                ["email"] = reader.GetString("email"),
                ["bio"] = reader.IsDBNull(reader.GetOrdinal("bio")) ? null! : reader.GetString("bio"),
                ["avatar_url"] = defaultAvatarUrl,
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

    public bool UpdateUserAvatar(int userId, string avatarUrl)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"👤 Updating avatar for user {userId}: {avatarUrl}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"UPDATE users 
                                SET avatar_url = @v, updated_at = CURRENT_TIMESTAMP 
                                WHERE id = @id";
            cmd.Parameters.AddWithValue("@v", avatarUrl);
            cmd.Parameters.AddWithValue("@id", userId);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            
            if (rowsAffected == 1)
            {
                Console.WriteLine($"✓ Updated avatar for user {userId}");
                return true;
            }
            
            _lastError = "User not found or update failed";
            Console.WriteLine($"✗ Failed to update avatar for user {userId}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error updating user avatar: {ex.Message}");
            return false;
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
            
            // Get user's registration date to start charts from that date
            DateTime registrationDate = DateTime.Today.AddDays(-364); // Default to last 365 days
            using (var regCmd = conn.CreateCommand())
            {
                regCmd.CommandText = "SELECT created_at FROM users WHERE id = @u";
                regCmd.Parameters.AddWithValue("@u", userId);
                var regResult = regCmd.ExecuteScalar();
                if (regResult != null && regResult != DBNull.Value)
                {
                    registrationDate = Convert.ToDateTime(regResult).Date;
                    Console.WriteLine($"📅 User {userId} registered on: {registrationDate:yyyy-MM-dd}");
                }
            }
            int daysSinceRegistration = (int)(DateTime.Today - registrationDate).TotalDays;
            if (daysSinceRegistration < 0) daysSinceRegistration = 0;

            // Get all plan_days for user's plans, aggregated by date (both actual_count and target_count)
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT 
                    pd.date,
                    COALESCE(SUM(pd.actual_count), 0) as daily_count,
                    COALESCE(SUM(pd.target_count), 0) as daily_target
                FROM plan_days pd
                INNER JOIN plans p ON pd.plan_id = p.id
                WHERE p.user_id = @u
                    AND pd.date >= @regDate
                GROUP BY pd.date
                ORDER BY pd.date ASC";
            cmd.Parameters.AddWithValue("@u", userId);
            cmd.Parameters.AddWithValue("@regDate", registrationDate);
            
            using var reader = cmd.ExecuteReader();
            var dailyStats = new Dictionary<string, (int actual, int target)>();
            
            while (reader.Read())
            {
                var date = reader.GetDateTime("date").ToString("yyyy-MM-dd");
                var actualCount = reader.GetInt32("daily_count");
                var targetCount = reader.GetInt32("daily_target");
                dailyStats[date] = (actualCount, targetCount);
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
            
            // Generate activity data for last 365 days (fill missing days with 0)
            var today = DateTime.Today;
            var activityData = new List<Dictionary<string, object>>();
            var allDaysData = new List<Dictionary<string, object>>();
            var allDaysDataSet = new HashSet<string>(); // Track dates already added
            long cumulative = 0;
            int bestDay = 0;
            int currentStreak = 0;
            
            // Build all days data from registration date to today
            for (int i = daysSinceRegistration; i >= 0; i--)
            {
                var date = today.AddDays(-i);
                var dateKey = date.ToString("yyyy-MM-dd");
                var (actualCount, targetCount) = dailyStats.ContainsKey(dateKey) ? dailyStats[dateKey] : (0, 0);
                
                cumulative += actualCount;
                
                if (actualCount > bestDay)
                {
                    bestDay = actualCount;
                }
                
                var dayData = new Dictionary<string, object>
                {
                    ["date"] = dateKey,
                    ["count"] = actualCount,
                    ["target"] = targetCount
                };
                
                allDaysData.Add(dayData);
                allDaysDataSet.Add(dateKey);
                
                // Last 14 days for bar chart
                if (i < 14)
                {
                    activityData.Add(dayData);
                }
            }
            
            // Add all remaining days of the current month (including future dates)
            var currentMonthStart = new DateTime(today.Year, today.Month, 1);
            var currentMonthEnd = currentMonthStart.AddMonths(1).AddDays(-1);
            
            for (var date = currentMonthStart; date <= currentMonthEnd; date = date.AddDays(1))
            {
                var dateKey = date.ToString("yyyy-MM-dd");
                
                // Only add if not already in allDaysData
                if (!allDaysDataSet.Contains(dateKey))
                {
                    var (actualCount, targetCount) = dailyStats.ContainsKey(dateKey) ? dailyStats[dateKey] : (0, 0);
                    
                    var dayData = new Dictionary<string, object>
                    {
                        ["date"] = dateKey,
                        ["count"] = actualCount,
                        ["target"] = targetCount
                    };
                    
                    allDaysData.Add(dayData);
                    allDaysDataSet.Add(dateKey);
                }
            }
            
            // Sort allDaysData by date to ensure proper ordering
            allDaysData.Sort((a, b) => 
            {
                var dateA = DateTime.Parse(a["date"]?.ToString() ?? "");
                var dateB = DateTime.Parse(b["date"]?.ToString() ?? "");
                return dateA.CompareTo(dateB);
            });
            
            // Get user login dates for streak calculation
            var loginDates = new HashSet<string>();
            try
            {
                using (var loginCmd = conn.CreateCommand())
                {
                    loginCmd.CommandText = @"
                        SELECT DISTINCT login_date
                        FROM user_logins
                        WHERE user_id = @u
                            AND login_date >= @regDate
                        ORDER BY login_date ASC";
                    loginCmd.Parameters.AddWithValue("@u", userId);
                    loginCmd.Parameters.AddWithValue("@regDate", registrationDate);
                    using var loginReader = loginCmd.ExecuteReader();
                    while (loginReader.Read())
                    {
                        var loginDate = loginReader.GetDateTime(0).ToString("yyyy-MM-dd");
                        loginDates.Add(loginDate);
                    }
                }
                Console.WriteLine($"✓ Found {loginDates.Count} login dates for user {userId}");
            }
            catch (MySqlException ex)
            {
                // Table might not exist yet - log warning but continue
                Console.WriteLine($"⚠ Warning: Could not fetch login dates (table might not exist): {ex.Message}");
                // Continue with empty loginDates - streak will be 0 until table is created
            }
            
            // Calculate current streak (counting backwards from today)
            // Streak logic: Only counts consecutive days of login
            // - User must login (any authenticated API call counts as login) each day
            // - If user logs in on day 1, streak = 1
            // - If user logs in on day 1 and day 2, streak = 2, etc.
            // - If a day is missed (no login), the streak breaks
            // - We allow today to be 0 without breaking the streak yet (user has all day to login)
            // - Login is tracked automatically via LoginTrackingMiddleware on every authenticated request
            Console.WriteLine($"📊 Calculating streak: Found {loginDates.Count} login dates");
            
            // Build a set of all dates from registration to today to check for consecutive logins
            // Reuse existing 'today' variable defined earlier in the method
            var allDates = new List<string>();
            for (int i = daysSinceRegistration; i >= 0; i--)
            {
                var date = today.AddDays(-i);
                allDates.Add(date.ToString("yyyy-MM-dd"));
            }
            
            // Calculate streak by counting backwards from today
            for (int i = allDates.Count - 1; i >= 0; i--)
            {
                var dateKey = allDates[i];
                bool userLoggedIn = loginDates.Contains(dateKey);
                
                // Debug logging for today and recent days
                if (i >= allDates.Count - 3)
                {
                    Console.WriteLine($"  Day {dateKey}: Login={userLoggedIn}");
                }
                
                // Streak increases if user logged in on this day
                if (userLoggedIn)
                {
                    currentStreak++;
                }
                else if (i == allDates.Count - 1)
                {
                    // Today might not have login yet, but we don't break yet - keep looking at previous days
                    continue;
                }
                else
                {
                    // Gap found in previous days (no login)
                    Console.WriteLine($"  Streak broken at {dateKey}: No login recorded");
                    break;
                }
            }
            Console.WriteLine($"✓ Final streak: {currentStreak} days");
            
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

    public bool RecordUserLogin(int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            // Insert or update login date for today (using INSERT ... ON DUPLICATE KEY UPDATE)
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO user_logins (user_id, login_date)
                VALUES (@uid, CURDATE())
                ON DUPLICATE KEY UPDATE login_date = login_date";
            cmd.Parameters.AddWithValue("@uid", userId);
            cmd.ExecuteNonQuery();
            
            Console.WriteLine($"✓ Recorded login for user {userId} on {DateTime.Today:yyyy-MM-dd}");
            return true;
        }
        catch (MySqlException ex)
        {
            // If table doesn't exist (error 1146), try to create it
            if (ex.Number == 1146) // Table doesn't exist
            {
                Console.WriteLine($"⚠ user_logins table doesn't exist, attempting to create it...");
                try
                {
                    using var createConn = new MySqlConnection(_connectionString);
                    createConn.Open();
                    using var createCmd = createConn.CreateCommand();
                    createCmd.CommandText = @"
                        CREATE TABLE IF NOT EXISTS user_logins (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            user_id INT NOT NULL,
                            login_date DATE NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                            UNIQUE KEY unique_user_login_date (user_id, login_date)
                        )";
                    createCmd.ExecuteNonQuery();
                    Console.WriteLine($"✓ Created user_logins table");
                    
                    // Retry the insert
                    using var retryCmd = createConn.CreateCommand();
                    retryCmd.CommandText = @"
                        INSERT INTO user_logins (user_id, login_date)
                        VALUES (@uid, CURDATE())
                        ON DUPLICATE KEY UPDATE login_date = login_date";
                    retryCmd.Parameters.AddWithValue("@uid", userId);
                    retryCmd.ExecuteNonQuery();
                    Console.WriteLine($"✓ Recorded login for user {userId} on {DateTime.Today:yyyy-MM-dd} (after table creation)");
                    return true;
                }
                catch (Exception createEx)
                {
                    _lastError = $"Error creating user_logins table: {createEx.Message}";
                    Console.WriteLine($"✗ Error creating user_logins table: {createEx.Message}");
                    return false;
                }
            }
            
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error recording login: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error recording login: {ex.Message}");
            return false;
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
                               WHERE user_id = @uid AND is_archived = 0 
                               ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@uid", userId);
            
            using var reader = cmd.ExecuteReader();
            var projects = new List<Dictionary<string, object?>>();
            
            while (reader.Read())
            {
                var project = new Dictionary<string, object?>
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
                var project = new Dictionary<string, object?>
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

    public bool ArchiveProject(int id, int userId, bool isArchived)
    {
        _lastError = string.Empty;
        try
        {
            Console.WriteLine($"📦 Archiving project {id} for user {userId}: {isArchived}");
            
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE projects SET is_archived=@a WHERE id=@id AND user_id=@u";
            cmd.Parameters.AddWithValue("@a", isArchived);
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@u", userId);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            var result = rowsAffected == 1;
            
            if (result)
            {
                Console.WriteLine($"✓ Project {id} archived status set to {isArchived}");
            }
            else
            {
                _lastError = "Project not found or access denied";
                Console.WriteLine($"✗ Project {id} not found or access denied");
            }
            
            return result;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error archiving project: {ex.Message}");
            return false;
        }
    }

    public string GetArchivedProjectsJson(int userId)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"SELECT *, 0 as type FROM projects 
                                WHERE user_id = @u AND is_archived = 1
                                ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@u", userId);
            
            using var reader = cmd.ExecuteReader();
            var projects = new List<Dictionary<string, object>>();
            
            while (reader.Read())
            {
                var project = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    if (reader.IsDBNull(i))
                    {
                        project[fieldName] = null!;
                        continue;
                    }
                    
                    var val = reader.GetValue(i);
                    project[fieldName] = ConvertDbValueToJson(val) ?? (object)null!;
                }
                projects.Add(project);
            }
            
            Console.WriteLine($"✓ Retrieved {projects.Count} archived projects for user {userId}");
            return JsonSerializer.Serialize(projects);
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error getting archived projects: {ex.Message}");
            return "[]";
        }
    }

    public bool SubscribeNewsletter(string email)
    {
        _lastError = string.Empty;
        try
        {
            if (string.IsNullOrEmpty(_connectionString))
            {
                _lastError = "Database connection string is not configured";
                Console.WriteLine($"❌ Database connection string is empty");
                return false;
            }

            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for SubscribeNewsletter");

            // Ensure table exists (create if not exists)
            try
            {
                using (var ensureTableCmd = conn.CreateCommand())
                {
                    ensureTableCmd.CommandText = @"CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT TRUE,
                        INDEX idx_email (email)
                    )";
                    ensureTableCmd.ExecuteNonQuery();
                    Console.WriteLine($"✓ Newsletter subscriptions table ensured");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Warning: Could not ensure newsletter_subscriptions table exists: {ex.Message}");
                // Continue anyway - table might already exist
            }

            // Check if email already exists
            using (var checkCmd = conn.CreateCommand())
            {
                checkCmd.CommandText = "SELECT id FROM newsletter_subscriptions WHERE email = @email";
                checkCmd.Parameters.AddWithValue("@email", email);
                var existing = checkCmd.ExecuteScalar();
                
                if (existing != null)
                {
                    // Email already exists, update to active if it was inactive
                    using var updateCmd = conn.CreateCommand();
                    updateCmd.CommandText = @"UPDATE newsletter_subscriptions 
                                           SET is_active = TRUE, subscribed_at = CURRENT_TIMESTAMP 
                                           WHERE email = @email";
                    updateCmd.Parameters.AddWithValue("@email", email);
                    updateCmd.ExecuteNonQuery();
                    Console.WriteLine($"✓ Newsletter subscription reactivated: {email}");
                    return true;
                }
            }

            // Insert new subscription
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"INSERT INTO newsletter_subscriptions (email, is_active) 
                               VALUES (@email, TRUE)";
            cmd.Parameters.AddWithValue("@email", email);
            
            var result = cmd.ExecuteNonQuery() == 1;
            if (result)
            {
                Console.WriteLine($"✓ Newsletter subscription created: {email}");
            }
            else
            {
                Console.WriteLine($"✗ Failed to create newsletter subscription");
            }
            
            return result;
        }
        catch (MySqlException ex) when (ex.Number == 1062) // Duplicate entry
        {
            _lastError = $"Email {email} is already subscribed";
            Console.WriteLine($"✗ Duplicate newsletter subscription: {ex.Message}");
            return false;
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in SubscribeNewsletter: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in SubscribeNewsletter: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return false;
        }
    }

    public bool ResetPasswordByEmail(string email, string newPasswordHash)
    {
        _lastError = string.Empty;
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            conn.Open();
            Console.WriteLine($"✓ Database connection successful for ResetPasswordByEmail");

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE users SET password_hash = @hash WHERE email = @email";
            cmd.Parameters.AddWithValue("@hash", newPasswordHash);
            cmd.Parameters.AddWithValue("@email", email);
            
            var rowsAffected = cmd.ExecuteNonQuery();
            if (rowsAffected > 0)
            {
                Console.WriteLine($"✓ Password reset for: {email}");
                return true;
            }
            else
            {
                _lastError = "Email not found";
                Console.WriteLine($"✗ Email not found for password reset: {email}");
                return false;
            }
        }
        catch (MySqlException ex)
        {
            _lastError = $"Database error ({ex.Number}): {ex.Message}";
            Console.WriteLine($"✗ MySQL Error in ResetPasswordByEmail: {ex.Number} - {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _lastError = $"Error: {ex.Message}";
            Console.WriteLine($"✗ Error in ResetPasswordByEmail: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return false;
        }
    }
}
