using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("stats")]
public class StatsController : ControllerBase
{
    private readonly IDbService _db;
    
    public StatsController(IDbService db)
    {
        _db = db;
    }
    
    private int UserId() 
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == "user_id" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    /// <summary>
    /// Get user statistics
    /// GET /stats
    /// Returns total words, weekly average, best day, current streak, and activity data
    /// </summary>
    [Authorize]
    [HttpGet]
    public IActionResult GetStats()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📊 Stats GET request for user {userId}");
            
            var json = _db.GetStatsJson(userId);
            var data = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
            
            Console.WriteLine($"✅ Retrieved stats for user {userId}");
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching stats: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Failed to fetch stats" });
        }
    }
}

