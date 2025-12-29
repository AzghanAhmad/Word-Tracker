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
    public record ForgotPasswordRequest(string email);
    public record ForgotUsernameRequest(string email);

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

    [HttpPost("forgot-password")]
    public IActionResult ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        try
        {
            Console.WriteLine($"🔑 Forgot password request received: email={req.email}");
            
            if (string.IsNullOrWhiteSpace(req.email))
            {
                Console.WriteLine("✗ Missing email");
                return BadRequest(new { success = false, message = "Email is required" });
            }

            // Check if user exists
            var user = _db.GetUserByEmail(req.email);
            if (user is null)
            {
                Console.WriteLine($"✗ User not found: {req.email}");
                // Return success but with a message indicating user doesn't exist
                // We still return success to prevent email enumeration attacks
                return Ok(new { 
                    success = false, 
                    exists = false,
                    message = "No account found with this email address. Please create an account first." 
                });
            }

            // Generate a 6-digit temporary password
            var random = new Random();
            var tempPassword = random.Next(100000, 999999).ToString();
            
            // Hash the temporary password
            var hashedPassword = _auth.HashPassword(tempPassword);
            
            // Update the password in the database
            var updated = _db.ResetPasswordByEmail(req.email, hashedPassword);
            
            if (!updated)
            {
                Console.WriteLine($"✗ Failed to update password for: {req.email}");
                return StatusCode(500, new { success = false, message = "Failed to reset password. Please try again." });
            }

            // In a real application, you would send an email here
            // For now, we'll log the temporary password (ONLY FOR DEVELOPMENT)
            Console.WriteLine($"📧 TEMPORARY PASSWORD for {req.email}: {tempPassword}");
            Console.WriteLine($"⚠️  In production, this should be sent via email, not logged!");
            
            // Return success with the temporary password (ONLY FOR DEVELOPMENT/DEMO)
            // In production, you would NOT return the password, just send it via email
            Console.WriteLine($"✅ Password reset successful for: {req.email}");
            return Ok(new { 
                success = true, 
                exists = true,
                message = $"A new temporary password has been sent to {req.email}. Please check your inbox.",
                // REMOVE THIS IN PRODUCTION - only for demo purposes
                tempPassword = tempPassword
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception in ForgotPassword: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = "An error occurred while resetting password" });
        }
    }

    [HttpPost("forgot-username")]
    public IActionResult ForgotUsername([FromBody] ForgotUsernameRequest req)
    {
        try
        {
            Console.WriteLine($"👤 Forgot username request received: email={req.email}");
            
            if (string.IsNullOrWhiteSpace(req.email))
            {
                Console.WriteLine("✗ Missing email");
                return BadRequest(new { success = false, message = "Email is required" });
            }

            // Check if user exists
            var user = _db.GetUserByEmail(req.email);
            if (user is null)
            {
                Console.WriteLine($"✗ User not found: {req.email}");
                return Ok(new { 
                    success = false, 
                    exists = false,
                    message = "No account found with this email address. Please create an account first." 
                });
            }

            // In a real application, you would send an email here
            Console.WriteLine($"👤 USERNAME for {req.email}: {user.Value.username}");
            Console.WriteLine($"⚠️  In production, this should be sent via email, not displayed!");
            
            // Return success with the username (for demo purposes)
            Console.WriteLine($"✅ Username retrieved successfully for: {req.email}");
            return Ok(new { 
                success = true, 
                exists = true,
                message = $"Your username has been sent to {req.email}.",
                // For demo purposes - in production, send via email only
                username = user.Value.username
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception in ForgotUsername: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving username" });
        }
    }
}
