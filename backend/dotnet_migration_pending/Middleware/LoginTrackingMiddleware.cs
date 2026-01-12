using WordTracker.Api.Services;

namespace WordTracker.Api.Middleware;

public class LoginTrackingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDbService _db;

    public LoginTrackingMiddleware(RequestDelegate next, IDbService db)
    {
        _next = next;
        _db = db;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only track login for authenticated users on API routes
        if (context.User.Identity?.IsAuthenticated == true && 
            context.Request.Path.StartsWithSegments("/api"))
        {
            // Extract user ID from claims
            var userIdClaim = context.User.Claims.FirstOrDefault(c => 
                c.Type == "user_id" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier);
            
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
            {
                // Record login asynchronously (don't block the request)
                // This is similar to Snapchat - any authenticated activity counts as "opening the app"
                _ = Task.Run(() =>
                {
                    try
                    {
                        _db.RecordUserLogin(userId);
                    }
                    catch (Exception ex)
                    {
                        // Log error but don't fail the request
                        Console.WriteLine($"⚠ Warning: Failed to record login for user {userId}: {ex.Message}");
                    }
                });
            }
        }

        // Continue to next middleware
        await _next(context);
    }
}
