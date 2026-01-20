using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

/// <summary>
/// Controller for managing writing plans
/// Handles creation, retrieval, and deletion of user plans
/// </summary>
[ApiController]
[Route("plans")]
public class PlansController : ControllerBase
{
    private readonly IDbService _db;

    public PlansController(IDbService db)
    {
        _db = db;
    }

    /// <summary>
    /// Extracts user ID from JWT token claims
    /// </summary>
    private int UserId() => int.Parse(User.Claims.First(c => c.Type == "user_id").Value);

    /// <summary>
    /// Request model for creating a new plan
    /// </summary>
    public record CreatePlanRequest(
        string title,
        int total_word_count,
        string start_date,
        string end_date,
        string algorithm_type,
        string? description,
        bool? is_private,
        int? starting_point,
        string? measurement_unit,
        bool? is_daily_target,
        bool? fixed_deadline,
        string? target_finish_date,
        string? strategy_intensity,
        string? weekend_approach,
        int? reserve_days,
        string? display_view_type,
        string? week_start_day,
        string? grouping_type,
        string? dashboard_color,
        bool? show_historical_data,
        string? progress_tracking_type,
        string? activity_type,
        string? content_type,
        string? status,
        int? current_progress
    );

    /// <summary>
    /// Creates a new writing plan for the authenticated user
    /// POST /plans
    /// </summary>
    [Authorize]
    [HttpPost]
    public IActionResult Create([FromBody] CreatePlanRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📥 Received CreatePlan request for user {userId}");
            Console.WriteLine($"📝 Payload: Title='{req.title}', Words={req.total_word_count}, Start='{req.start_date}', End='{req.end_date}', Algo='{req.algorithm_type}'");

            // Validate required fields
            if (string.IsNullOrWhiteSpace(req.title))
            {
                Console.WriteLine("❌ Validation failed: Title is empty");
                return BadRequest(new { success = false, message = "Plan title is required" });
            }

            if (string.IsNullOrWhiteSpace(req.start_date))
            {
                Console.WriteLine("❌ Validation failed: Start date is empty");
                return BadRequest(new { success = false, message = "Start date is required" });
            }

            if (string.IsNullOrWhiteSpace(req.end_date))
            {
                Console.WriteLine("❌ Validation failed: End date is empty");
                return BadRequest(new { success = false, message = "End date is required" });
            }

            if (string.IsNullOrWhiteSpace(req.algorithm_type))
            {
                Console.WriteLine("❌ Validation failed: Algorithm type is empty");
                return BadRequest(new { success = false, message = "Algorithm type is required" });
            }

            // Validate word count
            if (req.total_word_count <= 0)
            {
                Console.WriteLine($"❌ Validation failed: Word count is {req.total_word_count}");
                return BadRequest(new { success = false, message = "Total word count must be greater than 0" });
            }

            // Validate dates
            if (!DateTime.TryParse(req.start_date, out var startDate))
            {
                Console.WriteLine($"❌ Validation failed: Invalid start date '{req.start_date}'");
                return BadRequest(new { success = false, message = "Invalid start date format" });
            }

            if (!DateTime.TryParse(req.end_date, out var endDate))
            {
                Console.WriteLine($"❌ Validation failed: Invalid end date '{req.end_date}'");
                return BadRequest(new { success = false, message = "Invalid end date format" });
            }

            if (endDate <= startDate)
            {
                Console.WriteLine($"❌ Validation failed: End date {req.end_date} is before or equal to start date {req.start_date}");
                return BadRequest(new { success = false, message = "End date must be after start date" });
            }

            // Create plan in database
            Console.WriteLine($"💾 Calling DbService.CreatePlan...");
            
            var planId = _db.CreatePlan(
                userId,
                req.title.Trim(),
                req.total_word_count,
                req.start_date,
                req.end_date,
                req.algorithm_type.ToLower(),
                req.description?.Trim(),
                req.is_private ?? false,
                req.starting_point ?? 0,
                req.measurement_unit ?? "words",
                req.is_daily_target ?? false,
                req.fixed_deadline ?? true,
                req.target_finish_date,
                req.strategy_intensity ?? "Average",
                req.weekend_approach ?? "The Usual",
                req.reserve_days ?? 0,
                req.display_view_type ?? "Table",
                req.week_start_day ?? "Mondays",
                req.grouping_type ?? "Day",
                req.dashboard_color ?? "#000000",
                req.show_historical_data ?? true,
                req.progress_tracking_type ?? "Daily Goals",
                req.activity_type ?? "Writing",
                req.content_type ?? "Novel",
                req.status ?? "active",
                req.current_progress ?? 0
            );

            if (planId > 0)
            {
                return StatusCode(201, new
                {
                    success = true,
                    message = "Plan created successfully",
                    id = planId
                });
            }

            // Get detailed error from database service
            var errorMessage = _db.GetLastError();
            Console.WriteLine($"Plan creation failed for user {userId}.");
            Console.WriteLine($"Error details: {errorMessage}");
            Console.WriteLine($"Request data: Title={req.title}, Words={req.total_word_count}, Start={req.start_date}, End={req.end_date}");
            
            // Return error message to frontend
            var userFriendlyMessage = string.IsNullOrWhiteSpace(errorMessage) 
                ? "Failed to create plan. Please check your input and try again." 
                : $"Failed to create plan: {errorMessage}";
            
            return StatusCode(500, new 
            { 
                success = false, 
                message = userFriendlyMessage,
                error = errorMessage // Include detailed error for debugging
            });
        }
        catch (Exception ex)
        {
            // Log full error for debugging
            Console.WriteLine($"Exception creating plan: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new 
            { 
                success = false, 
                message = $"An error occurred: {ex.Message}" 
            });
        }
    }

    /// <summary>
    /// Gets plan days (activity logs) for a specific plan
    /// GET /plans/{id}/days
    /// </summary>
    [Authorize]
    [HttpGet("{id}/days")]
    public IActionResult GetPlanDays(int id)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📅 Fetching plan days for plan {id}, user {userId}");
            var daysJson = _db.GetPlanDaysJson(id, userId);
            
            // Deserialize generically to object first to inspect
            var rawList = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(daysJson);
            
            // Re-map to ensure keys are lowercase snake_case explicitly
            var cleanList = rawList?.Select(d => new Dictionary<string, object>
            {
                ["id"] = d.ContainsKey("id") ? d["id"] : 0,
                ["date"] = d.ContainsKey("date") ? d["date"] : "",
                ["target_count"] = d.ContainsKey("target_count") ? d["target_count"] : 0,
                ["actual_count"] = d.ContainsKey("actual_count") ? d["actual_count"] : 0,
                ["notes"] = d.ContainsKey("notes") ? d["notes"] : null
            }).ToList();

            Console.WriteLine($"✅ Retrieved {cleanList?.Count ?? 0} plan days (Cleaned)");
            return Ok(new { success = true, data = cleanList });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error retrieving plan days: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving plan days" });
        }
    }

    /// <summary>
    /// Request model for logging progress
    /// </summary>
    public record LogProgressRequest(string date, int actual_count, string? notes, int? target_count);

    /// <summary>
    /// Logs progress for a specific day
    /// POST /plans/{id}/days
    /// </summary>
    [Authorize]
    [HttpPost("{id}/days")]
    public IActionResult LogDay(int id, [FromBody] LogProgressRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📥 Received log progress request - Plan ID: {id}, User ID: {userId}, Date: {req?.date}, Count: {req?.actual_count}");
            
            if (req == null)
            {
                Console.WriteLine("❌ Request body is null");
                return BadRequest(new { success = false, message = "Request body is required" });
            }
            
            if (string.IsNullOrWhiteSpace(req.date))
            {
                Console.WriteLine("❌ Date is empty");
                return BadRequest(new { success = false, message = "Date is required" });
            }

            if (!DateTime.TryParse(req.date, out var parsedDate))
            {
                Console.WriteLine($"❌ Invalid date format: {req.date}");
                return BadRequest(new { success = false, message = $"Invalid date format: {req.date}" });
            }

            var success = _db.LogPlanProgress(id, userId, req.date, req.actual_count, req.notes, req.target_count);
            
            if (success)
            {
                Console.WriteLine($"✅ Successfully logged progress for plan {id}");
                return Ok(new { success = true, message = "Progress logged successfully" });
            }

            var errorMsg = _db.GetLastError() ?? "Failed to log progress";
            Console.WriteLine($"❌ Failed to log progress: {errorMsg}");
            return StatusCode(500, new { success = false, message = errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception logging progress: {ex.Message}");
            Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"❌ Inner exception: {ex.InnerException.Message}");
            }
            return StatusCode(500, new { success = false, message = $"An error occurred while logging progress: {ex.Message}" });
        }
    }

    [Authorize]
    [HttpGet("archived")]
    public IActionResult GetArchived()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📋 Fetching archived plans for user {userId}");
            
            var json = _db.GetArchivedPlansJson(userId);
            var plansData = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(json);
            
            var transformedData = plansData?.Select(TransformPlan).ToList();
            
            Console.WriteLine($"✅ Retrieved {transformedData?.Count ?? 0} archived plans successfully");
            return Ok(new { success = true, data = transformedData });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception fetching archived plans: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while fetching archived plans" });
        }
    }

    private Dictionary<string, object> TransformPlan(Dictionary<string, object> plan)
    {
        string GetString(string key, string defaultValue = "") =>
            plan.ContainsKey(key) && plan[key] != null ? plan[key].ToString() ?? defaultValue : defaultValue;

        int GetInt(string key, int defaultValue = 0)
        {
            if (!plan.ContainsKey(key) || plan[key] == null) return defaultValue;
            if (plan[key] is int i) return i;
            if (int.TryParse(plan[key].ToString(), out var parsed)) return parsed;
            return defaultValue;
        }

        bool GetBool(string key, bool defaultValue = false)
        {
            if (!plan.ContainsKey(key) || plan[key] == null) return defaultValue;
            if (plan[key] is bool b) return b;
            var strVal = plan[key].ToString();
            if (strVal == "1") return true;
            if (strVal == "0") return false;
            return bool.TryParse(strVal, out var parsed) ? parsed : defaultValue;
        }

        var status = GetString("status", "active").ToLower();
        var statusMap = new Dictionary<string, string>
        {
            { "active", "In Progress" },
            { "paused", "On Hold" },
            { "completed", "Completed" },
            { "archived", "Archived" }
        };
        var frontendStatus = statusMap.ContainsKey(status) ? statusMap[status] : "In Progress";
        var totalWords = GetInt("total_word_count", 0);
        var currentProgress = GetInt("current_progress", 0);
        var dashboardColor = GetString("dashboard_color", "#000000");

        return new Dictionary<string, object>
        {
            ["id"] = GetInt("id", 0),
            ["plan_name"] = GetString("title", ""),
            ["title"] = GetString("title", ""),
            ["total_word_count"] = totalWords,
            ["target_amount"] = totalWords,
            ["completed_amount"] = (int)Math.Round((double)totalWords * currentProgress / 100.0),
            ["start_date"] = GetString("start_date", ""),
            ["end_date"] = GetString("end_date", ""),
            ["algorithm_type"] = GetString("algorithm_type", ""),
            ["status"] = frontendStatus,
            ["db_status"] = status, // Raw database status for editing
            ["description"] = GetString("description", ""),
            ["is_private"] = GetBool("is_private", false),
            ["starting_point"] = GetInt("starting_point", 0),
            ["measurement_unit"] = GetString("measurement_unit", "words"),
            ["is_daily_target"] = GetBool("is_daily_target", false),
            ["fixed_deadline"] = GetBool("fixed_deadline", true),
            ["target_finish_date"] = GetString("target_finish_date", ""),
            ["strategy_intensity"] = GetString("strategy_intensity", ""),
            ["weekend_approach"] = GetString("weekend_approach", ""),
            ["reserve_days"] = GetInt("reserve_days", 0),
            ["display_view_type"] = GetString("display_view_type", "Table"),
            ["week_start_day"] = GetString("week_start_day", "Mondays"),
            ["grouping_type"] = GetString("grouping_type", "Day"),
            ["dashboard_color"] = dashboardColor,
            ["color_code"] = dashboardColor,
            ["show_historical_data"] = GetBool("show_historical_data", true),
            ["progress_tracking_type"] = GetString("progress_tracking_type", "Daily Goals"),
            ["activity_type"] = GetString("activity_type", "Writing"),
            ["content_type"] = GetString("content_type", "Novel"),
            ["current_progress"] = currentProgress,
            ["progress"] = currentProgress,
            ["created_at"] = GetString("created_at", "")
        };
    }

    [Authorize]
    [HttpPatch("{id}/archive")]
    public IActionResult Archive(int id, [FromBody] ArchiveRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📦 Archiving plan {id} for user {userId}: {req.is_archived}");
            
            var ok = _db.ArchivePlan(id, userId, req.is_archived);
            
            if (ok)
            {
                Console.WriteLine($"✅ Plan {id} archive status updated");
                return Ok(new { success = true, message = req.is_archived ? "Plan archived successfully" : "Plan restored successfully" });
            }
            
            Console.WriteLine($"✗ Plan {id} not found or permission denied");
            return NotFound(new { success = false, message = "Plan not found or you don't have permission to modify it" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception archiving plan: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while archiving the plan" });
        }
    }

    public record ArchiveRequest(bool is_archived);

    /// <summary>
    /// Retrieves plans for the authenticated user
    /// GET /plans - Get all plans
    /// GET /plans?id={id} - Get specific plan
    /// </summary>
    [Authorize]
    [HttpGet]
    public IActionResult Get([FromQuery] int? id)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📋 Get Plans request - User ID: {userId}, Plan ID: {id?.ToString() ?? "null"}");

            // Get specific plan by ID
            if (id.HasValue)
            {
                var planJson = _db.GetPlanJson(id.Value, userId);
                if (planJson == null)
                    return NotFound(new { success = false, message = "Plan not found" });

                var planData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(planJson);
                if (planData == null)
                     return StatusCode(500, new { success = false, message = "Failed to deserialize plan" });

                var transformedPlan = TransformPlan(planData);
                return Ok(new { success = true, data = transformedPlan });
            }

            // Get all plans for user
            var plansJson = _db.GetPlansJson(userId);
            if (string.IsNullOrWhiteSpace(plansJson) || plansJson == "[]")
            {
                Console.WriteLine($"⚠ No plans found for user {userId} or empty result");
                return Ok(new { success = true, data = new List<object>() });
            }
            
            var plansData = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(plansJson);
            if (plansData == null || plansData.Count == 0)
            {
                Console.WriteLine($"⚠ Deserialized plans data is null or empty for user {userId}");
                return Ok(new { success = true, data = new List<object>() });
            }
            
            var transformedPlans = plansData.Select(TransformPlan).ToList();
            Console.WriteLine($"✅ Successfully transformed {transformedPlans.Count} plans for user {userId}");

            return Ok(new { success = true, data = transformedPlans });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error in Get Plans: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            var errorDetails = _db.GetLastError();
            if (!string.IsNullOrWhiteSpace(errorDetails))
            {
                Console.WriteLine($"Database error details: {errorDetails}");
            }
            return StatusCode(500, new { 
                success = false, 
                message = "An error occurred while retrieving plans",
                error = ex.Message // Include error for debugging
            });
        }
    }

    /// <summary>
    /// Updates an existing plan for the authenticated user
    /// PUT /plans/{id}
    /// </summary>
    [Authorize]
    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] CreatePlanRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"🔄 Updating plan {id} for user {userId}");
            Console.WriteLine($"📥 Request data - Title: '{req.title}', Start: '{req.start_date}', End: '{req.end_date}', Algo: '{req.algorithm_type}'");

            // Validate required fields
            if (string.IsNullOrWhiteSpace(req.title))
            {
                Console.WriteLine("❌ Validation failed: Title is empty");
                return BadRequest(new { success = false, message = "Plan title is required" });
            }

            if (string.IsNullOrWhiteSpace(req.start_date))
            {
                Console.WriteLine("❌ Validation failed: Start date is empty");
                return BadRequest(new { success = false, message = "Start date is required" });
            }

            if (string.IsNullOrWhiteSpace(req.end_date))
            {
                Console.WriteLine("❌ Validation failed: End date is empty");
                return BadRequest(new { success = false, message = "End date is required" });
            }

            if (string.IsNullOrWhiteSpace(req.algorithm_type))
            {
                Console.WriteLine("❌ Validation failed: Algorithm type is empty");
                return BadRequest(new { success = false, message = "Algorithm type is required" });
            }

            // Validate word count
            if (req.total_word_count <= 0)
                return BadRequest(new { success = false, message = "Total word count must be greater than 0" });

            // Validate dates
            if (!DateTime.TryParse(req.start_date, out var startDate))
                return BadRequest(new { success = false, message = "Invalid start date format" });

            if (!DateTime.TryParse(req.end_date, out var endDate))
                return BadRequest(new { success = false, message = "Invalid end date format" });

            if (endDate <= startDate)
                return BadRequest(new { success = false, message = "End date must be after start date" });

            var success = _db.UpdatePlan(
                id,
                userId,
                req.title.Trim(),
                req.total_word_count,
                req.start_date,
                req.end_date,
                req.algorithm_type.ToLower(),
                req.description?.Trim(),
                req.is_private ?? false,
                req.starting_point ?? 0,
                req.measurement_unit ?? "words",
                req.is_daily_target ?? false,
                req.fixed_deadline ?? true,
                req.target_finish_date,
                req.strategy_intensity ?? "Average",
                req.weekend_approach ?? "The Usual",
                req.reserve_days ?? 0,
                req.display_view_type ?? "Table",
                req.week_start_day ?? "Mondays",
                req.grouping_type ?? "Day",
                req.dashboard_color ?? "#000000",
                req.show_historical_data ?? true,
                req.progress_tracking_type ?? "Daily Goals",
                req.activity_type ?? "Writing",
                req.content_type ?? "Novel",
                req.status,
                req.current_progress
            );

            if (success)
            {
                Console.WriteLine($"✅ Plan {id} updated successfully");
                return Ok(new { success = true, message = "Plan updated successfully" });
            }

            var errorMsg = _db.GetLastError();
            Console.WriteLine($"✗ Failed to update plan {id}: {errorMsg}");
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to update plan" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception updating plan: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = $"An error occurred: {ex.Message}" });
        }
    }

    /// <summary>
    /// Deletes a plan for the authenticated user
    /// DELETE /plans?id={id}
    /// </summary>
    [Authorize]
    [HttpDelete]
    public IActionResult Delete([FromQuery] int? id)
    {
        try
        {
            if (!id.HasValue)
                return BadRequest(new { success = false, message = "Plan ID is required" });

            var deleted = _db.DeletePlan(id.Value, UserId());
            if (deleted)
                return Ok(new { success = true, message = "Plan deleted successfully" });

            return NotFound(new { success = false, message = "Plan not found or you don't have permission to delete it" });
        }
        catch
        {
            return StatusCode(500, new { success = false, message = "An error occurred while deleting the plan" });
        }
    }
    

    /// <summary>
    /// Gets all plans for the authenticated user, including their daily logs
    /// Optimized for calendar view to avoid N+1 requests
    /// GET /plans/calendar
    /// </summary>
    [Authorize]
    [HttpGet("calendar")]
    public IActionResult GetCalendarPlans()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📅 Fetching calendar plans for user {userId}");
            
            var plansJson = _db.GetCalendarPlansJson(userId);
            
            // Deserialize generically
            var plansData = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(plansJson);
            
            Console.WriteLine($"✅ Retrieved {plansData?.Count ?? 0} calendar plans");
            return Ok(new { success = true, data = plansData });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching calendar plans: {ex.Message}");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}
