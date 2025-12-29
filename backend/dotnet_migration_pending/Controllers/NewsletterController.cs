using Microsoft.AspNetCore.Mvc;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("newsletter")]
public class NewsletterController : ControllerBase
{
    private readonly IDbService _db;

    public NewsletterController(IDbService db)
    {
        _db = db;
    }

    public record NewsletterSubscribeRequest(string Email);

    [HttpPost("subscribe")]
    public IActionResult Subscribe([FromBody] NewsletterSubscribeRequest? request)
    {
        try
        {
            Console.WriteLine($"📧 Newsletter subscription request received");
            
            if (request == null)
            {
                Console.WriteLine("❌ Request body is null");
                return BadRequest(new { success = false, message = "Request body is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Email))
            {
                Console.WriteLine("❌ Email is empty");
                return BadRequest(new { success = false, message = "Email is required" });
            }

            // Basic email validation
            var emailRegex = new System.Text.RegularExpressions.Regex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$");
            if (!emailRegex.IsMatch(request.Email))
            {
                Console.WriteLine($"❌ Invalid email format: {request.Email}");
                return BadRequest(new { success = false, message = "Invalid email format" });
            }

            Console.WriteLine($"📧 Attempting to subscribe email: {request.Email}");
            var result = _db.SubscribeNewsletter(request.Email.Trim().ToLower());
            
            if (result)
            {
                Console.WriteLine($"✅ Newsletter subscription successful: {request.Email}");
                return Ok(new { success = true, message = "Successfully subscribed to newsletter" });
            }
            else
            {
                var error = _db.GetLastError();
                Console.WriteLine($"❌ Newsletter subscription failed: {error}");
                return Ok(new { success = false, message = error ?? "Failed to subscribe to newsletter" });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception in SubscribeNewsletter: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = "An error occurred while processing your subscription. Please try again later." });
        }
    }
}

