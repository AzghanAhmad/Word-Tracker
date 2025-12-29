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
    private int UserId() 
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == "user_id" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (claim == null) 
        {
            Console.WriteLine("❌ No user_id claim found in token!");
            foreach (var c in User.Claims) Console.WriteLine($"   Claim: {c.Type} = {c.Value}");
            throw new UnauthorizedAccessException("User identification missing from token");
        }
        return int.Parse(claim);
    }

    [Authorize]
    [HttpGet("stats")]
    public IActionResult Stats()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📊 Dashboard stats requested for user ID: {userId}");
            
            var json = _db.GetDashboardStatsJson(userId);
            Console.WriteLine($"📊 Dashboard stats JSON: {json}");
            
            var data = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(json);
            
            if (data.ValueKind == System.Text.Json.JsonValueKind.Undefined || data.ValueKind == System.Text.Json.JsonValueKind.Null)
            {
                Console.WriteLine("✗ Dashboard stats data is null or undefined");
                return StatusCode(500, new { success = false, message = "Failed to fetch stats" });
            }
            
            Console.WriteLine($"✅ Dashboard stats returned successfully for user {userId}");
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception in Dashboard Stats: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = "An error occurred while fetching dashboard stats" });
        }
    }
}
