using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("user")]
public class UserController : ControllerBase
{
    private readonly IDbService _db;
    private readonly IAuthService _auth;
    
    public UserController(IDbService db, IAuthService auth)
    {
        _db = db;
        _auth = auth;
    }
    
    private int UserId() 
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == "user_id" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    /// <summary>
    /// Get user profile
    /// GET /user/profile
    /// </summary>
    [Authorize]
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"👤 Profile GET request for user {userId}");
            
            var json = _db.GetUserProfileJson(userId);
            if (json == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }
            
            var data = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching profile: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Failed to fetch profile" });
        }
    }

    /// <summary>
    /// Update user profile
    /// PUT /user/profile
    /// </summary>
    [Authorize]
    [HttpPut("profile")]
    public IActionResult UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"👤 Profile UPDATE request for user {userId}");
            
            if (string.IsNullOrWhiteSpace(req.username))
            {
                return BadRequest(new { success = false, message = "Username is required" });
            }
            
            if (string.IsNullOrWhiteSpace(req.email))
            {
                return BadRequest(new { success = false, message = "Email is required" });
            }
            
            // Validate email format
            if (!req.email.Contains("@") || !req.email.Contains("."))
            {
                return BadRequest(new { success = false, message = "Invalid email format" });
            }
            
            var success = _db.UpdateUserProfile(userId, req.username.Trim(), req.email.Trim(), req.bio?.Trim());
            
            if (success)
            {
                return Ok(new { success = true, message = "Profile updated successfully" });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error updating profile: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Failed to update profile" });
        }
    }

    public record UpdateProfileRequest(string username, string email, string? bio);

    /// <summary>
    /// Change user password
    /// PUT /user/password
    /// </summary>
    [Authorize]
    [HttpPut("password")]
    public IActionResult ChangePassword([FromBody] ChangePasswordRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"🔐 Password change request for user {userId}");
            
            if (string.IsNullOrWhiteSpace(req.current_password) || 
                string.IsNullOrWhiteSpace(req.new_password))
            {
                return BadRequest(new { success = false, message = "Current password and new password are required" });
            }
            
            if (req.new_password.Length < 6)
            {
                return BadRequest(new { success = false, message = "New password must be at least 6 characters long" });
            }
            
            if (req.new_password != req.confirm_password)
            {
                return BadRequest(new { success = false, message = "New passwords do not match" });
            }
            
            // Get user by ID to get password hash
            var user = _db.GetUserById(userId);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }
            
            // Verify current password using BCrypt
            if (!BCrypt.Net.BCrypt.Verify(req.current_password, user.Value.passwordHash))
            {
                return BadRequest(new { success = false, message = "Current password is incorrect" });
            }
            
            // Hash new password using BCrypt
            var newHash = _auth.HashPassword(req.new_password);
            
            var success = _db.UpdateUserPassword(userId, user.Value.passwordHash, newHash);
            
            if (success)
            {
                return Ok(new { success = true, message = "Password changed successfully" });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error changing password: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Failed to change password" });
        }
    }

    public record ChangePasswordRequest(string current_password, string new_password, string confirm_password);

    /// <summary>
    /// Get user settings
    /// GET /user/settings
    /// </summary>
    [Authorize]
    [HttpGet("settings")]
    public IActionResult GetSettings()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"⚙️ Settings GET request for user {userId}");
            
            var json = _db.GetUserSettingsJson(userId);
            if (json == null)
            {
                return StatusCode(500, new { success = false, message = "Failed to fetch settings" });
            }
            
            var data = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching settings: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Failed to fetch settings" });
        }
    }

    /// <summary>
    /// Update user settings
    /// PUT /user/settings
    /// </summary>
    [Authorize]
    [HttpPut("settings")]
    public IActionResult UpdateSettings([FromBody] UpdateSettingsRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"⚙️ Settings UPDATE request for user {userId}");
            
            string? professionsJson = null;
            if (req.professions != null && req.professions.Length > 0)
            {
                professionsJson = JsonSerializer.Serialize(req.professions);
            }
            
            var success = _db.UpdateUserSettings(
                userId,
                req.date_format,
                req.week_start_day,
                req.email_reminders_enabled,
                req.reminder_timezone,
                req.reminder_frequency,
                professionsJson
            );
            
            if (success)
            {
                return Ok(new { success = true, message = "Settings updated successfully" });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error updating settings: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Failed to update settings" });
        }
    }

    public record UpdateSettingsRequest(
        string? date_format,
        string? week_start_day,
        bool? email_reminders_enabled,
        string? reminder_timezone,
        string? reminder_frequency,
        string[]? professions
    );

    /// <summary>
    /// Delete user account
    /// DELETE /user/account
    /// </summary>
    [Authorize]
    [HttpDelete("account")]
    public IActionResult DeleteAccount()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"🗑️ Account deletion request for user {userId}");
            
            var success = _db.DeleteUserAccount(userId);
            
            if (success)
            {
                return Ok(new { success = true, message = "Account deleted successfully" });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error deleting account: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Failed to delete account" });
        }
    }
    /// <summary>
    /// Upload user avatar
    /// POST /user/avatar
    /// </summary>
    [Authorize]
    [HttpPost("avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile avatar)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📸 Avatar upload request for user {userId}");
            
            if (avatar == null || avatar.Length == 0)
            {
                return BadRequest(new { success = false, message = "No file uploaded" });
            }
            
            // Validate file type
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(avatar.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new { success = false, message = "Invalid file type. Allowed: JPG, PNG, GIF, WEBP" });
            }
            
            // Validate file size (max 5MB)
            if (avatar.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { success = false, message = "File too large. Max 5MB allowed." });
            }
            
            // Create uploads directory if it doesn't exist
            var currentDir = Directory.GetCurrentDirectory();
            var possibleUploadsBase = new[]
            {
                Path.Combine(currentDir, "wwwroot"),
                Path.Combine(currentDir, "backend", "dotnet_migration_pending", "wwwroot")
            };
            
            string wwwroot = possibleUploadsBase.FirstOrDefault(Directory.Exists) ?? Path.Combine(currentDir, "wwwroot");
            var uploadsDir = Path.Combine(wwwroot, "uploads", "avatars");
            
            if (!Directory.Exists(uploadsDir))
            {
                Directory.CreateDirectory(uploadsDir);
            }
            
            // Generate unique filename
            var fileName = $"avatar_{userId}_{DateTime.UtcNow.Ticks}{extension}";
            var filePath = Path.Combine(uploadsDir, fileName);
            
            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await avatar.CopyToAsync(stream);
            }
            
            // Update database
            var avatarUrl = $"/uploads/avatars/{fileName}";
            var success = _db.UpdateUserAvatar(userId, avatarUrl);
            
            if (success)
            {
                return Ok(new { success = true, message = "Avatar uploaded successfully", avatar_url = avatarUrl });
            }
            
            return StatusCode(500, new { success = false, message = "Failed to update user record" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error uploading avatar: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Failed to upload avatar" });
        }
    }
}

