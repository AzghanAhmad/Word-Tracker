using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
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
        string description, 
        string goal_type, 
        decimal goal_amount, 
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
            Console.WriteLine($"🏆 Create challenge request received: {req?.title}");
            var userId = UserId();

            // 1. Validation Rules
            var errors = new Dictionary<string, string>();

            // Challenge Name
            if (string.IsNullOrWhiteSpace(req?.title))
                errors.Add("title", "Challenge name is required");
            else if (req.title.Length < 3)
                errors.Add("title", "Challenge name must be at least 3 characters");
            else if (!_db.IsChallengeTitleUnique(userId, req.title))
                errors.Add("title", "A challenge with this name already exists");

            // Description
            if (string.IsNullOrWhiteSpace(req?.description))
                errors.Add("description", "Description is required");
            else if (req.description.Length < 10)
                errors.Add("description", "Description must be at least 10 characters");

            // Goal Type
            var validGoalTypes = new[] { "word_count", "time_based", "task_based" };
            if (string.IsNullOrWhiteSpace(req?.goal_type) || !validGoalTypes.Contains(req.goal_type))
                errors.Add("goal_type", "Please select a valid goal type (word_count, time_based, or task_based)");

            // Goal Amount
            if (req == null || req.goal_amount <= 0)
                errors.Add("goal_amount", "Goal amount must be a positive number");
            else if (req.goal_type == "word_count" || req.goal_type == "time_based" || req.goal_type == "task_based")
            {
                // Requirement expects integer for these types
                if (req.goal_amount % 1 != 0)
                    errors.Add("goal_amount", "Goal amount must be an integer for the selected goal type");
            }

            // Dates
            DateTime startDate, endDate;
            bool startParsed = DateTime.TryParse(req?.start_date, out startDate);
            bool endParsed = DateTime.TryParse(req?.end_date, out endDate);

            if (!startParsed)
                errors.Add("start_date", "Invalid start date format");
            else if (startDate.Date < DateTime.Today)
                errors.Add("start_date", "Start date must be today or a future date");

            if (!endParsed)
                errors.Add("end_date", "Invalid end date format");
            else if (startParsed && endDate.Date <= startDate.Date)
                errors.Add("end_date", "End date must be greater than start date");

            if (startParsed && endParsed)
            {
                var duration = (endDate.Date - startDate.Date).TotalDays + 1;
                if (duration < 1)
                    errors.Add("end_date", "Duration must be at least 1 day");
            }

            if (errors.Count > 0)
            {
                return BadRequest(new { success = false, message = "Validation failed", errors });
            }

            // 2. Business Logic
            var totalDays = (int)(endDate.Date - startDate.Date).TotalDays + 1;
            var dailyTarget = req.goal_amount / totalDays;
            
            // Round appropriately (to integer if word count/task, or 2 decimals if others)
            if (req.goal_type == "word_count" || req.goal_type == "task_based")
                dailyTarget = Math.Ceiling(dailyTarget);
            else
                dailyTarget = Math.Round(dailyTarget, 2);

            string status;
            var today = DateTime.Today;
            if (today < startDate.Date)
                status = "upcoming";
            else if (today >= startDate.Date && today <= endDate.Date)
                status = "active";
            else
                status = "completed"; // Should not happen on creation usually but safe check

            // 3. Save to database
            var id = _db.CreateChallenge(
                userId, 
                req.title, 
                req.description, 
                req.goal_type, 
                (int)req.goal_amount, 
                startDate.ToString("yyyy-MM-dd"), 
                endDate.ToString("yyyy-MM-dd"),
                req.is_public ?? true,
                status,
                totalDays,
                dailyTarget
            );
            
            if (id > 0)
            {
                Console.WriteLine($"✅ Challenge created successfully with ID: {id}");
                return StatusCode(201, new { 
                    success = true, 
                    message = "Challenge created successfully", 
                    id,
                    redirect_url = $"/challenges/{id}" 
                });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to create challenge" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception creating challenge: {ex.Message}");
            return StatusCode(500, new { success = false, message = $"An unexpected error occurred: {ex.Message}" });
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
            
            // Get today's date
            var today = DateTime.Today.ToString("yyyy-MM-dd");
            
            // Update total progress
            var ok = _db.UpdateChallengeProgress(id, userId, req.progress);
            
            if (ok)
            {
                // Also log to daily log
                _db.LogChallengeProgress(id, userId, today, req.progress);
                
                Console.WriteLine($"✅ Progress updated and logged successfully");
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
    /// Get challenge daily logs for a user
    /// GET /challenges/{id}/logs
    /// </summary>
    [Authorize]
    [HttpGet("{id}/logs")]
    public IActionResult GetLogs(int id)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📋 Fetching logs for challenge {id}, user {userId}");
            
            var logsJson = _db.GetChallengeLogsJson(id, userId);
            var logsData = System.Text.Json.JsonSerializer.Deserialize<object[]>(logsJson);
            
            Console.WriteLine($"✅ Retrieved {logsData?.Length ?? 0} logs");
            return Ok(new { success = true, data = logsData });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception fetching logs: {ex.Message}");
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
