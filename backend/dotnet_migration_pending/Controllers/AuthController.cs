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
            Console.WriteLine($"📝 Register request received: username={req.username}, email={req.email}");
            
            if (string.IsNullOrWhiteSpace(req.username) || string.IsNullOrWhiteSpace(req.email) || string.IsNullOrWhiteSpace(req.password))
            {
                Console.WriteLine("✗ Missing required fields");
                return BadRequest(new { success = false, message = "Missing required fields" });
            }
            
            if (req.password.Length < 6)
            {
                Console.WriteLine("✗ Password too short");
                return BadRequest(new { success = false, message = "Password must be at least 6 characters" });
            }
            
            if (!System.Text.RegularExpressions.Regex.IsMatch(req.email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            {
                Console.WriteLine("✗ Invalid email format");
                return BadRequest(new { success = false, message = "Invalid email format" });
            }
            
            var hash = _auth.HashPassword(req.password);
            var ok = _db.CreateUser(req.username, req.email, hash);
            
            if (!ok)
            {
                var errorMsg = _db.GetLastError();
                Console.WriteLine($"✗ Registration failed: {errorMsg}");
                return Conflict(new { 
                    success = false, 
                    message = string.IsNullOrWhiteSpace(errorMsg) 
                        ? "Registration failed. Email or username already exists." 
                        : errorMsg 
                });
            }
            
            Console.WriteLine($"✅ User registered successfully: {req.username}");
            return Ok(new { success = true, message = "User registered successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception in Register: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = "An error occurred during registration" });
        }
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest req)
    {
        try
        {
            Console.WriteLine($"🔐 Login request received: email={req.email}");
            
            if (string.IsNullOrWhiteSpace(req.email) || string.IsNullOrWhiteSpace(req.password))
            {
                Console.WriteLine("✗ Missing email or password");
                return BadRequest(new { success = false, message = "Missing email or password" });
            }
            
            var user = _db.GetUserByEmail(req.email);
            if (user is null)
            {
                Console.WriteLine($"✗ User not found: {req.email}");
                return Unauthorized(new { success = false, message = "Invalid email or password" });
            }
            
            if (!_auth.VerifyPassword(req.password, user.Value.passwordHash))
            {
                Console.WriteLine($"✗ Invalid password for user: {req.email}");
                return Unauthorized(new { success = false, message = "Invalid email or password" });
            }
            
            var token = _auth.GenerateToken(user.Value.id);
            Console.WriteLine($"✅ Login successful: {user.Value.username} (ID: {user.Value.id})");
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
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception in Login: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = "An error occurred during login" });
        }
    }
}
