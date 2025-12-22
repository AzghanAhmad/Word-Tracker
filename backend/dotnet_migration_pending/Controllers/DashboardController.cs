using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDbService _db;
    public DashboardController(IDbService db) { _db = db; }
    private int UserId() => int.Parse(User.Claims.First(c => c.Type == "user_id").Value);

    [Authorize]
    [HttpGet("stats")]
    public IActionResult Stats()
    {
        var json = _db.GetDashboardStatsJson(UserId());
        var data = System.Text.Json.JsonSerializer.Deserialize<object>(json);
        if (data is null) return StatusCode(500, new { success = false, message = "Failed to fetch stats" });
        return Ok(new { success = true, data });
    }
}
