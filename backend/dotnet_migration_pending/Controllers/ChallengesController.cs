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

    public record CreateChallengeRequest(
        string title, 
        string? description, 
        string? type, 
        int target_words, 
        string start_date, 
        string end_date,
        bool? is_public
    );
    
    public record UpdateProgressRequest(int progress);

    /// <summary>
    /// Creates a new challenge
    /// POST /challenges
    /// </summary>
    [Authorize]
    [HttpPost]
    public IActionResult Create([FromBody] CreateChallengeRequest req)
    {
        try
        {
            Console.WriteLine($"🏆 Create challenge request received");
            Console.WriteLine($"   Title: {req?.title ?? "null"}");
            Console.WriteLine($"   Target words: {req?.target_words}");
            Console.WriteLine($"   Start: {req?.start_date}, End: {req?.end_date}");
            
            if (string.IsNullOrWhiteSpace(req?.title) || req.target_words <= 0 || 
                string.IsNullOrWhiteSpace(req.start_date) || string.IsNullOrWhiteSpace(req.end_date))
            {
                return BadRequest(new { success = false, message = "Missing required fields (title, target_words, start_date, end_date)" });
            }
            
            var userId = UserId();
            var id = _db.CreateChallenge(
                userId, 
                req.title, 
                req.description ?? "", 
                req.type ?? "word_count", 
                req.target_words, 
                req.start_date, 
                req.end_date,
                req.is_public ?? true
            );
            
            if (id > 0)
            {
                Console.WriteLine($"✅ Challenge created successfully with ID: {id}");
                return StatusCode(201, new { success = true, message = "Challenge created", id });
            }
            
            var errorMsg = _db.GetLastError();
            Console.WriteLine($"✗ Failed to create challenge: {errorMsg}");
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to create challenge" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception creating challenge: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"Error: {ex.Message}" });
        }
    }

    /// <summary>
    /// Get all challenges the user has joined
    /// GET /challenges
    /// </summary>
    [Authorize]
    [HttpGet]
    public IActionResult Get()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📋 Fetching challenges for user {userId}");
            
            var json = _db.GetChallengesJson(userId);
            var data = System.Text.Json.JsonSerializer.Deserialize<object>(json);
            
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception fetching challenges: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"Error: {ex.Message}" });
        }
    }

    /// <summary>
    /// Get all public challenges (browse challenges)
    /// GET /challenges/public
    /// </summary>
    [Authorize]
    [HttpGet("public")]
    public IActionResult GetPublic()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"🌍 Fetching all public challenges");
            
            var json = _db.GetAllPublicChallengesJson(userId);
            var data = System.Text.Json.JsonSerializer.Deserialize<object>(json);
            
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception fetching public challenges: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"Error: {ex.Message}" });
        }
    }

    /// <summary>
    /// Get a specific challenge by ID
    /// GET /challenges/{id}
    /// </summary>
    [Authorize]
    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"🔍 Fetching challenge {id}");
            
            var json = _db.GetChallengeJson(id, userId);
            
            if (json == null)
            {
                return NotFound(new { success = false, message = "Challenge not found" });
            }
            
            var data = System.Text.Json.JsonSerializer.Deserialize<object>(json);
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception fetching challenge: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"Error: {ex.Message}" });
        }
    }

    /// <summary>
    /// Join a challenge
    /// POST /challenges/{id}/join
    /// </summary>
    [Authorize]
    [HttpPost("{id}/join")]
    public IActionResult Join(int id)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"👤 User {userId} joining challenge {id}");
            
            var ok = _db.JoinChallenge(id, userId);
            
            if (ok)
            {
                Console.WriteLine($"✅ Successfully joined challenge {id}");
                return Ok(new { success = true, message = "Successfully joined the challenge" });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to join challenge" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception joining challenge: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"Error: {ex.Message}" });
        }
    }

    /// <summary>
    /// Join a challenge by invite code
    /// POST /challenges/join-by-code
    /// </summary>
    [Authorize]
    [HttpPost("join-by-code")]
    public IActionResult JoinByInviteCode([FromBody] JoinByCodeRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"🔑 User {userId} attempting to join challenge with invite code: {req.invite_code}");
            
            if (string.IsNullOrWhiteSpace(req.invite_code))
            {
                return BadRequest(new { success = false, message = "Invite code is required" });
            }
            
            // Find challenge by invite code
            var challengeId = _db.GetChallengeIdByInviteCode(req.invite_code.Trim().ToUpper());
            
            if (!challengeId.HasValue)
            {
                var errorMsg = _db.GetLastError();
                return NotFound(new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Invalid or expired invite code" : errorMsg });
            }
            
            // Join the challenge
            var ok = _db.JoinChallenge(challengeId.Value, userId);
            
            if (ok)
            {
                Console.WriteLine($"✅ Successfully joined challenge {challengeId.Value} via invite code");
                return Ok(new { success = true, message = "Successfully joined the challenge", challenge_id = challengeId.Value });
            }
            
            var joinErrorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(joinErrorMsg) ? "Failed to join challenge" : joinErrorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception joining challenge by invite code: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"Error: {ex.Message}" });
        }
    }

    public record JoinByCodeRequest(string invite_code);

    /// <summary>
    /// Leave a challenge
    /// POST /challenges/{id}/leave
    /// </summary>
    [Authorize]
    [HttpPost("{id}/leave")]
    public IActionResult Leave(int id)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"👤 User {userId} leaving challenge {id}");
            
            var ok = _db.LeaveChallenge(id, userId);
            
            if (ok)
            {
                Console.WriteLine($"✅ Successfully left challenge {id}");
                return Ok(new { success = true, message = "Successfully left the challenge" });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to leave challenge" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception leaving challenge: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"Error: {ex.Message}" });
        }
    }

    /// <summary>
    /// Update progress for a challenge
    /// PATCH /challenges/{id}/progress
    /// </summary>
    [Authorize]
    [HttpPatch("{id}/progress")]
    public IActionResult UpdateProgress(int id, [FromBody] UpdateProgressRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📊 User {userId} updating progress in challenge {id}: {req.progress}");
            
            var ok = _db.UpdateChallengeProgress(id, userId, req.progress);
            
            if (ok)
            {
                Console.WriteLine($"✅ Progress updated successfully");
                return Ok(new { success = true, message = "Progress updated successfully" });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to update progress" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception updating progress: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"Error: {ex.Message}" });
        }
    }

    /// <summary>
    /// Delete a challenge (only owner can delete)
    /// DELETE /challenges/{id}
    /// </summary>
    [Authorize]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"🗑️ User {userId} deleting challenge {id}");
            
            var ok = _db.DeleteChallenge(id, userId);
            
            if (ok)
            {
                Console.WriteLine($"✅ Challenge {id} deleted successfully");
                return Ok(new { success = true, message = "Challenge deleted successfully" });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to delete challenge" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception deleting challenge: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"Error: {ex.Message}" });
        }
    }
}
