using Microsoft.AspNetCore.Mvc;

namespace WordTracker.Api.Controllers;

[ApiController]
public class HomeController : ControllerBase
{
    [HttpGet("/")]
    public IActionResult Get()
    {
        return Ok(new
        {
            message = "Word Tracker API",
            version = "1.0.0",
            status = "running",
            endpoints = new
            {
                auth = new
                {
                    register = "POST /auth/register",
                    login = "POST /auth/login"
                },
                plans = new
                {
                    create = "POST /plans (requires auth)",
                    get = "GET /plans (requires auth)",
                    delete = "DELETE /plans?id={id} (requires auth)"
                },
                checklists = new
                {
                    create = "POST /checklists (requires auth)",
                    get = "GET /checklists (requires auth)",
                    delete = "DELETE /checklists?id={id} (requires auth)",
                    addItem = "POST /checklist_items (requires auth)"
                },
                challenges = new
                {
                    create = "POST /challenges (requires auth)",
                    get = "GET /challenges (requires auth)"
                },
                dashboard = new
                {
                    stats = "GET /dashboard/stats (requires auth)"
                }
            },
            documentation = "See SETUP_GUIDE.md for API usage examples"
        });
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}

