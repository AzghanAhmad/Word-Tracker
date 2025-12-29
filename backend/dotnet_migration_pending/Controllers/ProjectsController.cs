using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

/// <summary>
/// Controller for managing organization projects
/// Handles creation, retrieval, update, and deletion of user projects
/// </summary>
[ApiController]
[Route("projects")]
public class ProjectsController : ControllerBase
{
    private readonly IDbService _db;

    public ProjectsController(IDbService db)
    {
        _db = db;
    }

    /// <summary>
    /// Extracts user ID from JWT token claims
    /// </summary>
    private int UserId() => int.Parse(User.Claims.First(c => c.Type == "user_id").Value);

    /// <summary>
    /// Request model for creating/updating a project
    /// </summary>
    public record ProjectRequest(
        string name,
        string? subtitle,
        string? description,
        bool? is_private
    );

    /// <summary>
    /// Creates a new project for the authenticated user
    /// POST /projects
    /// </summary>
    [Authorize]
    [HttpPost]
    public IActionResult Create([FromBody] ProjectRequest req)
    {
        try
        {
            Console.WriteLine($"📝 Create project request received: name={req.name}");
            
            if (string.IsNullOrWhiteSpace(req.name))
            {
                Console.WriteLine("✗ Missing required field: name");
                return BadRequest(new { success = false, message = "Project name is required" });
            }

            if (req.name.Length > 255)
            {
                Console.WriteLine("✗ Name too long");
                return BadRequest(new { success = false, message = "Project name must be 255 characters or less" });
            }

            var userId = UserId();
            var projectId = _db.CreateProject(
                userId,
                req.name.Trim(),
                req.subtitle?.Trim(),
                req.description?.Trim(),
                req.is_private ?? false
            );

            if (projectId > 0)
            {
                Console.WriteLine($"✅ Project created successfully: {req.name} (ID: {projectId})");
                return StatusCode(201, new
                {
                    success = true,
                    message = "Project created successfully",
                    id = projectId
                });
            }

            var errorMsg = _db.GetLastError();
            Console.WriteLine($"✗ Failed to create project: {errorMsg}");
            return StatusCode(500, new
            {
                success = false,
                message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to create project" : errorMsg
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception creating project: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = $"An error occurred: {ex.Message}" });
        }
    }

    /// <summary>
    /// Retrieves projects for the authenticated user
    /// GET /projects - Get all projects
    /// GET /projects/{id} - Get specific project
    /// </summary>
    [Authorize]
    [HttpGet]
    public IActionResult Get([FromQuery] int? id)
    {
        try
        {
            var userId = UserId();

            // Get specific project by ID
            if (id.HasValue)
            {
                var projectJson = _db.GetProjectJson(id.Value, userId);
                if (projectJson == null)
                    return NotFound(new { success = false, message = "Project not found" });

                var projectData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(projectJson);
                return Ok(new { success = true, data = projectData });
            }

            // Get all projects for user
            var projectsJson = _db.GetProjectsJson(userId);
            var projectsData = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(projectsJson);

            return Ok(new { success = true, data = projectsData ?? new List<Dictionary<string, object>>() });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception retrieving projects: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving projects" });
        }
    }

    [Authorize]
    [HttpGet("archived")]
    public IActionResult GetArchived()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📋 Fetching archived projects for user {userId}");
            
            var json = _db.GetArchivedProjectsJson(userId);
            var data = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(json);
            
            Console.WriteLine($"✅ Retrieved {data?.Count ?? 0} archived projects for user {userId}");
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception retrieving archived projects: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving archived projects" });
        }
    }

    /// <summary>
    /// Gets a specific project by ID
    /// GET /projects/{id}
    /// </summary>
    [Authorize]
    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        try
        {
            var userId = UserId();
            var projectJson = _db.GetProjectJson(id, userId);
            
            if (projectJson == null)
                return NotFound(new { success = false, message = "Project not found" });

            var projectData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(projectJson);
            return Ok(new { success = true, data = projectData });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception retrieving project: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving the project" });
        }
    }

    /// <summary>
    /// Updates an existing project for the authenticated user
    /// PUT /projects/{id}
    /// </summary>
    [Authorize]
    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] ProjectRequest req)
    {
        try
        {
            Console.WriteLine($"🔄 Update project request received: id={id}, name={req.name}");
            
            if (string.IsNullOrWhiteSpace(req.name))
            {
                Console.WriteLine("✗ Missing required field: name");
                return BadRequest(new { success = false, message = "Project name is required" });
            }

            if (req.name.Length > 255)
            {
                Console.WriteLine("✗ Name too long");
                return BadRequest(new { success = false, message = "Project name must be 255 characters or less" });
            }

            var userId = UserId();
            var success = _db.UpdateProject(
                id,
                userId,
                req.name.Trim(),
                req.subtitle?.Trim(),
                req.description?.Trim(),
                req.is_private ?? false
            );

            if (success)
            {
                Console.WriteLine($"✅ Project {id} updated successfully");
                return Ok(new { success = true, message = "Project updated successfully" });
            }

            var errorMsg = _db.GetLastError();
            Console.WriteLine($"✗ Failed to update project {id}: {errorMsg}");
            return StatusCode(500, new
            {
                success = false,
                message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to update project" : errorMsg
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception updating project: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = $"An error occurred: {ex.Message}" });
        }
    }

    /// <summary>
    /// Deletes a project for the authenticated user
    /// DELETE /projects/{id}
    /// </summary>
    [Authorize]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        try
        {
            var userId = UserId();
            var deleted = _db.DeleteProject(id, userId);
            
            if (deleted)
            {
                Console.WriteLine($"✅ Project {id} deleted successfully");
                return Ok(new { success = true, message = "Project deleted successfully" });
            }

            Console.WriteLine($"✗ Project {id} not found or no permission");
            return NotFound(new { success = false, message = "Project not found or you don't have permission to delete it" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception deleting project: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = "An error occurred while deleting the project" });
        }
    }

    [Authorize]
    [HttpPatch("{id}/archive")]
    public IActionResult Archive(int id, [FromBody] ArchiveRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📦 Archiving project {id} for user {userId}: {req.is_archived}");
            
            var ok = _db.ArchiveProject(id, userId, req.is_archived);
            
            if (ok)
            {
                Console.WriteLine($"✅ Project {id} archive status updated");
                return Ok(new { success = true, message = req.is_archived ? "Project archived successfully" : "Project restored successfully" });
            }
            
            Console.WriteLine($"✗ Project {id} not found or permission denied");
            return NotFound(new { success = false, message = "Project not found or you don't have permission to modify it" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception archiving project: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while archiving the project" });
        }
    }

    public record ArchiveRequest(bool is_archived);
}

