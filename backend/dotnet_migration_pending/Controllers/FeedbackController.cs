using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("feedback")]
public class FeedbackController : ControllerBase
{
    private readonly IDbService _db;

    public FeedbackController(IDbService db)
    {
        _db = db;
    }

    private int? UserId()
    {
        try
        {
            var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id");
            return userIdClaim != null ? int.Parse(userIdClaim.Value) : null;
        }
        catch
        {
            return null;
        }
    }

    public record CreateFeedbackRequest(string type, string? email, string message);

    /// <summary>
    /// Creates a new feedback entry
    /// POST /feedback
    /// Can be called with or without authentication (user_id will be null if not authenticated)
    /// </summary>
    [HttpPost]
    public IActionResult Create([FromBody] CreateFeedbackRequest req)
    {
        try
        {
            Console.WriteLine($"💬 Feedback submission received: Type={req.type}, Email={req.email ?? "null"}");

            if (string.IsNullOrWhiteSpace(req.message))
            {
                return BadRequest(new { success = false, message = "Message is required" });
            }

            if (string.IsNullOrWhiteSpace(req.type))
            {
                return BadRequest(new { success = false, message = "Feedback type is required" });
            }

            // Get user ID if authenticated (optional)
            int? userId = null;
            try
            {
                userId = UserId();
            }
            catch
            {
                // Not authenticated, that's okay for feedback
            }

            var feedbackId = _db.CreateFeedback(userId, req.type, req.email, req.message.Trim());

            if (feedbackId > 0)
            {
                Console.WriteLine($"✅ Feedback created successfully with ID: {feedbackId}");
                return Ok(new { success = true, message = "Thank you for your feedback! We appreciate your input." });
            }

            var errorMsg = _db.GetLastError();
            Console.WriteLine($"✗ Failed to create feedback: {errorMsg}");
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to submit feedback" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception creating feedback: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while submitting feedback" });
        }
    }
}

