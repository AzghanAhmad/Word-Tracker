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
        string? content_type
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
            // Validate required fields
            if (string.IsNullOrWhiteSpace(req.title))
                return BadRequest(new { success = false, message = "Plan title is required" });

            if (string.IsNullOrWhiteSpace(req.start_date))
                return BadRequest(new { success = false, message = "Start date is required" });

            if (string.IsNullOrWhiteSpace(req.end_date))
                return BadRequest(new { success = false, message = "End date is required" });

            if (string.IsNullOrWhiteSpace(req.algorithm_type))
                return BadRequest(new { success = false, message = "Algorithm type is required" });

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

            // Create plan in database
            var userId = UserId();
            
            // Log request for debugging
            Console.WriteLine($"Creating plan for user {userId}: Title={req.title}, Words={req.total_word_count}, Start={req.start_date}, End={req.end_date}");
            
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
                req.content_type ?? "Novel"
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
            var daysData = System.Text.Json.JsonSerializer.Deserialize<object[]>(daysJson);
            Console.WriteLine($"✅ Retrieved {daysData?.Length ?? 0} plan days");
            return Ok(new { success = true, data = daysData });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error retrieving plan days: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving plan days" });
        }
    }

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

            // Get specific plan by ID
            if (id.HasValue)
            {
                var planJson = _db.GetPlanJson(id.Value, userId);
                if (planJson == null)
                    return NotFound(new { success = false, message = "Plan not found" });

                var planData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(planJson);
                
                // Transform to match frontend expectations (same as list endpoint)
                string GetString(string key, string defaultValue = "")
                {
                    if (!planData.ContainsKey(key) || planData[key] == null) return defaultValue;
                    return planData[key].ToString() ?? defaultValue;
                }

                int GetInt(string key, int defaultValue = 0)
                {
                    if (!planData.ContainsKey(key) || planData[key] == null) return defaultValue;
                    if (planData[key] is int i) return i;
                    if (int.TryParse(planData[key].ToString(), out var parsed)) return parsed;
                    return defaultValue;
                }

                bool GetBool(string key, bool defaultValue = false)
                {
                    if (!planData.ContainsKey(key) || planData[key] == null) return defaultValue;
                    if (planData[key] is bool b) return b;
                    if (bool.TryParse(planData[key].ToString(), out var parsed)) return parsed;
                    return defaultValue;
                }

                var status = GetString("status", "active").ToLower();
                var statusMap = new Dictionary<string, string>
                {
                    { "active", "In Progress" },
                    { "paused", "On Hold" },
                    { "completed", "Completed" }
                };
                var frontendStatus = statusMap.ContainsKey(status) ? statusMap[status] : "In Progress";

                var totalWords = GetInt("total_word_count", 0);
                var dashboardColor = GetString("dashboard_color", "#000000");

                var transformedPlan = new Dictionary<string, object>
                {
                    ["id"] = GetInt("id", 0),
                    ["plan_name"] = GetString("title", ""),
                    ["title"] = GetString("title", ""),
                    ["total_word_count"] = totalWords,
                    ["target_amount"] = totalWords,
                    ["completed_amount"] = 0,
                    ["start_date"] = GetString("start_date", ""),
                    ["end_date"] = GetString("end_date", ""),
                    ["algorithm_type"] = GetString("algorithm_type", ""),
                    ["status"] = frontendStatus,
                    ["description"] = GetString("description", ""),
                    ["is_private"] = GetBool("is_private", false),
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
                    ["progress"] = 0
                };

                return Ok(new { success = true, data = transformedPlan });
            }

            // Get all plans for user
            var plansJson = _db.GetPlansJson(userId);
            var plansData = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(plansJson);

            // Transform database fields to match frontend expectations
            var transformedPlans = plansData?.Select(plan =>
            {
                // Helper function to safely get string value
                string GetString(string key, string defaultValue = "") =>
                    plan.ContainsKey(key) && plan[key] != null ? plan[key].ToString() ?? defaultValue : defaultValue;

                // Helper function to safely get int value
                int GetInt(string key, int defaultValue = 0)
                {
                    if (!plan.ContainsKey(key) || plan[key] == null) return defaultValue;
                    if (plan[key] is int i) return i;
                    if (int.TryParse(plan[key].ToString(), out var parsed)) return parsed;
                    return defaultValue;
                }

                // Helper function to safely get bool value
                bool GetBool(string key, bool defaultValue = false)
                {
                    if (!plan.ContainsKey(key) || plan[key] == null) return defaultValue;
                    if (plan[key] is bool b) return b;
                    if (bool.TryParse(plan[key].ToString(), out var parsed)) return parsed;
                    return defaultValue;
                }

                // Convert status to frontend format
                var status = GetString("status", "active").ToLower();
                var statusMap = new Dictionary<string, string>
                {
                    { "active", "In Progress" },
                    { "paused", "On Hold" },
                    { "completed", "Completed" }
                };
                var frontendStatus = statusMap.ContainsKey(status) ? statusMap[status] : "In Progress";

                var totalWords = GetInt("total_word_count", 0);
                var dashboardColor = GetString("dashboard_color", "#000000");

                return new Dictionary<string, object>
                {
                    ["id"] = GetInt("id", 0),
                    ["plan_name"] = GetString("title", ""),
                    ["title"] = GetString("title", ""),
                    ["total_word_count"] = totalWords,
                    ["target_amount"] = totalWords,
                    ["completed_amount"] = 0, // Will be calculated from plan_days in future
                    ["start_date"] = GetString("start_date", ""),
                    ["end_date"] = GetString("end_date", ""),
                    ["algorithm_type"] = GetString("algorithm_type", ""),
                    ["status"] = frontendStatus,
                    ["description"] = GetString("description", ""),
                    ["is_private"] = GetBool("is_private", false),
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
                    ["progress"] = 0 // Will be calculated in frontend
                };
            }).ToList();

            return Ok(new { success = true, data = transformedPlans });
        }
        catch
        {
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving plans" });
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

            // Validate required fields
            if (string.IsNullOrWhiteSpace(req.title))
                return BadRequest(new { success = false, message = "Plan title is required" });

            if (string.IsNullOrWhiteSpace(req.start_date))
                return BadRequest(new { success = false, message = "Start date is required" });

            if (string.IsNullOrWhiteSpace(req.end_date))
                return BadRequest(new { success = false, message = "End date is required" });

            if (string.IsNullOrWhiteSpace(req.algorithm_type))
                return BadRequest(new { success = false, message = "Algorithm type is required" });

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
                req.content_type ?? "Novel"
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
}
