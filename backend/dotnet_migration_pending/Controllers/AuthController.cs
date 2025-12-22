using Microsoft.AspNetCore.Mvc;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IDbService _db;
    public AuthController(IAuthService auth, IDbService db)
    {
        _auth = auth;
        _db = db;
    }

    public record RegisterRequest(string username, string email, string password);
    public record LoginRequest(string email, string password);

    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest req)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(req.username) || string.IsNullOrWhiteSpace(req.email) || string.IsNullOrWhiteSpace(req.password))
                return BadRequest(new { success = false, message = "Missing required fields" });
            
            if (req.password.Length < 6)
                return BadRequest(new { success = false, message = "Password must be at least 6 characters" });
            
            if (!System.Text.RegularExpressions.Regex.IsMatch(req.email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                return BadRequest(new { success = false, message = "Invalid email format" });
            
            var hash = _auth.HashPassword(req.password);
            var ok = _db.CreateUser(req.username, req.email, hash);
            if (!ok) 
                return Conflict(new { success = false, message = "Registration failed. Email or username already exists." });
            
            return Ok(new { success = true, message = "User registered successfully" });
        }
        catch
        {
            return StatusCode(500, new { success = false, message = "An error occurred during registration" });
        }
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest req)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(req.email) || string.IsNullOrWhiteSpace(req.password))
                return BadRequest(new { success = false, message = "Missing email or password" });
            
            var user = _db.GetUserByEmail(req.email);
            if (user is null) 
                return Unauthorized(new { success = false, message = "Invalid email or password" });
            
            if (!_auth.VerifyPassword(req.password, user.Value.passwordHash))
                return Unauthorized(new { success = false, message = "Invalid email or password" });
            
            var token = _auth.GenerateToken(user.Value.id);
            return Ok(new { 
                success = true, 
                token, 
                user = new { 
                    id = user.Value.id, 
                    username = user.Value.username,
                    email = req.email
                } 
            });
        }
        catch
        {
            return StatusCode(500, new { success = false, message = "An error occurred during login" });
        }
    }
}
