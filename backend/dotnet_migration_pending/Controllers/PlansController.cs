using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("plans")]
public class PlansController : ControllerBase
{
    private readonly IDbService _db;
    public PlansController(IDbService db) { _db = db; }

    private int UserId() => int.Parse(User.Claims.First(c => c.Type == "user_id").Value);

    public record CreatePlanRequest(
        string title,
        int total_word_count,
        string start_date,
        string end_date,
        string algorithm_type,
        string? description,
        bool? is_private,
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
        string? progress_tracking_type
    );

    [Authorize]
    [HttpPost]
    public IActionResult Create([FromBody] CreatePlanRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.title) || string.IsNullOrWhiteSpace(req.start_date) || string.IsNullOrWhiteSpace(req.end_date) || string.IsNullOrWhiteSpace(req.algorithm_type))
            return StatusCode(400, new { success = false, message = "Missing required fields" });
        var id = _db.CreatePlan(
            UserId(),
            req.title,
            req.total_word_count,
            req.start_date,
            req.end_date,
            req.algorithm_type,
            req.description,
            req.is_private ?? false,
            0,
            req.measurement_unit,
            req.is_daily_target ?? true,
            req.fixed_deadline ?? true,
            req.target_finish_date,
            req.strategy_intensity,
            req.weekend_approach,
            req.reserve_days ?? 0,
            req.display_view_type ?? "calendar",
            req.week_start_day ?? "Monday",
            req.grouping_type ?? "none",
            req.dashboard_color ?? "blue",
            req.show_historical_data ?? true,
            req.progress_tracking_type ?? "linear"
        );
        if (id > 0) return StatusCode(201, new { success = true, message = "Plan created", id });
        return StatusCode(500, new { success = false, message = "Failed to create plan" });
    }

    [Authorize]
    [HttpGet]
    public IActionResult Get([FromQuery] int? id)
    {
        if (id is int pid)
        {
            var json = _db.GetPlanJson(pid, UserId());
            if (json is null) return StatusCode(404, new { success = false, message = "Plan not found" });
            return Ok(new { success = true, data = System.Text.Json.JsonSerializer.Deserialize<object>(json) });
        }
        var listJson = _db.GetPlansJson(UserId());
        var data = System.Text.Json.JsonSerializer.Deserialize<object>(listJson);
        return Ok(new { success = true, data });
    }

    [Authorize]
    [HttpDelete]
    public IActionResult Delete([FromQuery] int? id)
    {
        if (id is null) return StatusCode(400, new { success = false, message = "Missing id" });
        var ok = _db.DeletePlan(id.Value, UserId());
        if (ok) return Ok(new { success = true, message = "Plan deleted" });
        return StatusCode(500, new { success = false, message = "Failed to delete plan" });
    }
}
