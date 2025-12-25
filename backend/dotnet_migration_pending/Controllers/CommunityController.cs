using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("community")]
public class CommunityController : ControllerBase
{
    private readonly IDbService _db;
    
    public CommunityController(IDbService db)
    {
        _db = db;
    }
    
    private int UserId() => int.Parse(User.Claims.First(c => c.Type == "user_id").Value);

    /// <summary>
    /// Get public plans for community page
    /// GET /community
    /// Returns public plans from all users (except the requesting user)
    /// </summary>
    [Authorize]
    [HttpGet]
    public IActionResult GetPublicPlans()
    {
        try
        {
            Console.WriteLine("🌐 Community GET request received");
            var userId = UserId();
            
            var json = _db.GetPublicPlansJson(userId);
            var data = JsonSerializer.Deserialize<object[]>(json);
            
            Console.WriteLine($"✅ Retrieved {data?.Length ?? 0} public plans for community");
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching community plans: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Failed to fetch community plans" });
        }
    }
}

