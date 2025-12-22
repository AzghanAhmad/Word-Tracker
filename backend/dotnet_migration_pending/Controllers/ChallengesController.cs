using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("challenges")]
public class ChallengesController : ControllerBase
{
    private readonly IDbService _db;
    public ChallengesController(IDbService db) { _db = db; }
    private int UserId() => int.Parse(User.Claims.First(c => c.Type == "user_id").Value);

    public record CreateChallengeRequest(string title, string? description, string type, int goal_count, int? duration_days, string start_date);

    [Authorize]
    [HttpPost]
    public IActionResult Create([FromBody] CreateChallengeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.title) || string.IsNullOrWhiteSpace(req.type) || req.goal_count <= 0 || string.IsNullOrWhiteSpace(req.start_date))
            return StatusCode(400, new { success = false, message = "Missing required fields" });
        var id = _db.CreateChallenge(UserId(), req.title, req.description ?? "", req.type, req.goal_count, req.duration_days ?? 30, req.start_date);
        if (id > 0) return StatusCode(201, new { success = true, message = "Challenge created", id });
        return StatusCode(500, new { success = false, message = "Failed to create challenge" });
    }

    [Authorize]
    [HttpGet]
    public IActionResult Get()
    {
        var json = _db.GetChallengesJson(UserId());
        var data = System.Text.Json.JsonSerializer.Deserialize<object>(json);
        return Ok(new { success = true, data });
    }
}
