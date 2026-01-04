using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("checklists")]
public class ChecklistsController : ControllerBase
{
    private readonly IDbService _db;
    public ChecklistsController(IDbService db) { _db = db; }
    private int UserId() => int.Parse(User.Claims.First(c => c.Type == "user_id").Value);

    public record ChecklistItemRequest(int? id, string text, bool? is_done, bool? is_completed, bool? @checked);
    public record CreateChecklistRequest(string name, int? plan_id, ChecklistItemRequest[]? items, ChecklistItemRequest[]? tasks);
    public record AddItemRequest(int checklist_id, string content);
    public record ArchiveRequest(bool is_archived);

    /// <summary>
    /// Creates a new checklist with items for the authenticated user
    /// POST /checklists
    /// </summary>
    [Authorize]
    [HttpPost]
    public IActionResult Create([FromBody] CreateChecklistRequest req)
    {
        try
        {
            Console.WriteLine($"📝 Checklist creation request received");
            Console.WriteLine($"   Name: {req?.name ?? "null"}");
            Console.WriteLine($"   Plan ID: {req?.plan_id?.ToString() ?? "null"}");
            Console.WriteLine($"   Items count: {req?.items?.Length ?? 0}");

            if (req == null)
            {
                Console.WriteLine("✗ Request body is null");
                return BadRequest(new { success = false, message = "Request body is required" });
            }

            if (string.IsNullOrWhiteSpace(req.name))
            {
                Console.WriteLine("✗ Checklist name is missing");
                return BadRequest(new { success = false, message = "Checklist name is required" });
            }

            var userId = UserId();
            Console.WriteLine($"📝 Creating checklist for user {userId}: {req.name}");

            // Combine items and tasks for maximum compatibility
            var allItems = new List<ChecklistItemRequest>();
            if (req.items != null) allItems.AddRange(req.items);
            if (req.tasks != null) allItems.AddRange(req.tasks);

            // Convert items to JsonElement array for the service
            System.Text.Json.JsonElement[]? itemsArray = null;
            if (allItems.Count > 0)
            {
                Console.WriteLine($"   Processing {allItems.Count} items");
                try
                {
                    var itemsJson = System.Text.Json.JsonSerializer.Serialize(allItems);
                    Console.WriteLine($"   Items JSON: {itemsJson}");
                    var itemsDoc = System.Text.Json.JsonDocument.Parse(itemsJson);
                    itemsArray = itemsDoc.RootElement.EnumerateArray().ToArray();
                    Console.WriteLine($"   Converted to {itemsArray.Length} JsonElements");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"✗ Error converting items: {ex.Message}");
                    return BadRequest(new { success = false, message = $"Invalid items format: {ex.Message}" });
                }
            }
            else
            {
                Console.WriteLine("   No items provided");
            }

            // Create checklist with items
            Console.WriteLine($"   Calling CreateChecklistWithItems...");
            var checklistId = _db.CreateChecklistWithItems(userId, req.plan_id, req.name, itemsArray);
            
            if (checklistId > 0)
            {
                Console.WriteLine($"✅ Checklist created successfully with ID: {checklistId}");
                var savedJson = _db.GetChecklistJson(checklistId, userId);
                var savedObj = string.IsNullOrEmpty(savedJson) ? null : System.Text.Json.JsonSerializer.Deserialize<object>(savedJson);
                return StatusCode(201, new { success = true, message = "Checklist created successfully", id = checklistId, data = savedObj });
            }

            var errorMsg = _db.GetLastError();
            Console.WriteLine($"✗ Failed to create checklist: {errorMsg}");
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to create checklist" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception creating checklist: {ex.Message}");
            Console.WriteLine($"   Type: {ex.GetType().Name}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"   Inner exception: {ex.InnerException.Message}");
            }
            return StatusCode(500, new { success = false, message = $"An error occurred: {ex.Message}" });
        }
    }

    /// <summary>
    /// Retrieves all checklists with items for the authenticated user
    /// GET /checklists - Get all checklists
    /// GET /checklists?id={id} - Get specific checklist
    /// </summary>
    [Authorize]
    [HttpGet]
    public IActionResult Get([FromQuery] int? id)
    {
        try
        {
            var userId = UserId();
            
            // Get specific checklist by ID
            if (id.HasValue)
            {
                Console.WriteLine($"📋 Fetching checklist {id.Value} for user {userId}");
                var checklistJson = _db.GetChecklistJson(id.Value, userId);
                
                if (checklistJson == null)
                {
                    return NotFound(new { success = false, message = "Checklist not found" });
                }
                
                var checklistData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(checklistJson);
                Console.WriteLine($"✅ Retrieved checklist {id.Value} successfully");
                return Ok(new { success = true, data = checklistData });
            }
            
            // Get all checklists
            Console.WriteLine($"📋 Fetching all checklists for user {userId}");
            var json = _db.GetChecklistsJson(userId);
            var data = System.Text.Json.JsonSerializer.Deserialize<object>(json);
            
            Console.WriteLine($"✅ Retrieved checklists successfully");
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception fetching checklists: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while fetching checklists" });
        }
    }

    /// <summary>
    /// Retrieves all archived checklists for the authenticated user
    /// GET /checklists/archived
    /// </summary>
    [Authorize]
    [HttpGet("archived")]
    public IActionResult GetArchived()
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📋 Fetching archived checklists for user {userId}");
            
            var json = _db.GetArchivedChecklistsJson(userId);
            var data = System.Text.Json.JsonSerializer.Deserialize<object>(json);
            
            Console.WriteLine($"✅ Retrieved archived checklists successfully");
            return Ok(new { success = true, data });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception fetching archived checklists: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while fetching archived checklists" });
        }
    }

    /// <summary>
    /// Updates an existing checklist with items
    /// PUT /checklists/{id}
    /// </summary>
    [Authorize]
    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] CreateChecklistRequest req)
    {
        try
        {
            Console.WriteLine($"📝 UPDATE REQUEST RECEIVED for checklist {id}");
            Console.WriteLine($"   Request body: {System.Text.Json.JsonSerializer.Serialize(req)}");
            Console.WriteLine($"   Name: {req?.name ?? "null"}");
            Console.WriteLine($"   Plan ID: {req?.plan_id?.ToString() ?? "null"}");
            Console.WriteLine($"   Items count: {req?.items?.Length ?? 0}");

            if (req == null)
            {
                Console.WriteLine("✗ Request body is null");
                return BadRequest(new { success = false, message = "Request body is required" });
            }

            if (string.IsNullOrWhiteSpace(req.name))
            {
                Console.WriteLine("✗ Checklist name is missing");
                return BadRequest(new { success = false, message = "Checklist name is required" });
            }

            var userId = UserId();
            Console.WriteLine($"   User ID: {userId}");

            // Combine items and tasks for maximum compatibility
            var allItems = new List<ChecklistItemRequest>();
            if (req.items != null) allItems.AddRange(req.items);
            if (req.tasks != null) allItems.AddRange(req.tasks);

            // Convert items to JsonElement array
            System.Text.Json.JsonElement[]? itemsArray = null;
            if (allItems.Count > 0)
            {
                Console.WriteLine($"   Processing {allItems.Count} items");
                var itemsJson = System.Text.Json.JsonSerializer.Serialize(allItems);
                Console.WriteLine($"   Items JSON: {itemsJson}");
                var itemsDoc = System.Text.Json.JsonDocument.Parse(itemsJson);
                itemsArray = itemsDoc.RootElement.EnumerateArray().ToArray();
                Console.WriteLine($"   Converted to {itemsArray.Length} JsonElements");
            }
            else
            {
                Console.WriteLine("   No items provided");
            }

            Console.WriteLine($"   Calling UpdateChecklist...");
            var ok = _db.UpdateChecklist(id, userId, req.plan_id, req.name, itemsArray);
            
            if (ok)
            {
                Console.WriteLine($"✅ Checklist {id} updated successfully");
                var savedJson = _db.GetChecklistJson(id, userId);
                var savedObj = string.IsNullOrEmpty(savedJson) ? null : System.Text.Json.JsonSerializer.Deserialize<object>(savedJson);
                return Ok(new { success = true, message = "Checklist updated successfully", data = savedObj });
            }

            var errorMsg = _db.GetLastError();
            Console.WriteLine($"✗ Failed to update checklist {id}: {errorMsg}");
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to update checklist" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception updating checklist {id}: {ex.Message}");
            Console.WriteLine($"   Type: {ex.GetType().Name}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"   Inner exception: {ex.InnerException.Message}");
            }
            return StatusCode(500, new { success = false, message = $"An error occurred: {ex.Message}" });
        }
    }

    /// <summary>
    /// Archives or unarchives a checklist
    /// PATCH /checklists/{id}/archive
    /// </summary>
    [Authorize]
    [HttpPatch("{id}/archive")]
    public IActionResult Archive(int id, [FromBody] ArchiveRequest req)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"📦 Archiving checklist {id} for user {userId}: {req.is_archived}");
            
            var ok = _db.ArchiveChecklist(id, userId, req.is_archived);
            
            if (ok)
            {
                Console.WriteLine($"✅ Checklist {id} archive status updated");
                return Ok(new { success = true, message = req.is_archived ? "Checklist archived successfully" : "Checklist unarchived successfully" });
            }
            
            Console.WriteLine($"✗ Checklist {id} not found or permission denied");
            return NotFound(new { success = false, message = "Checklist not found or you don't have permission to modify it" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception archiving checklist: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while archiving the checklist" });
        }
    }

    /// <summary>
    /// Deletes a checklist for the authenticated user
    /// DELETE /checklists/{id}
    /// </summary>
    [Authorize]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        try
        {
            var userId = UserId();
            Console.WriteLine($"🗑️ Deleting checklist {id} for user {userId}");
            
            var ok = _db.DeleteChecklist(id, userId);
            
            if (ok)
            {
                Console.WriteLine($"✅ Checklist {id} deleted successfully");
                return Ok(new { success = true, message = "Checklist deleted successfully" });
            }
            
            Console.WriteLine($"✗ Checklist {id} not found or permission denied");
            return NotFound(new { success = false, message = "Checklist not found or you don't have permission to delete it" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception deleting checklist: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while deleting the checklist" });
        }
    }

    /// <summary>
    /// Adds an item to an existing checklist
    /// POST /checklists/items
    /// </summary>
    [Authorize]
    [HttpPost("items")]
    public IActionResult AddItem([FromBody] AddItemRequest req)
    {
        try
        {
            if (req.checklist_id <= 0 || string.IsNullOrWhiteSpace(req.content))
            {
                return BadRequest(new { success = false, message = "Checklist ID and content are required" });
            }

            var ok = _db.AddChecklistItem(req.checklist_id, req.content);
            
            if (ok)
            {
                return Ok(new { success = true, message = "Item added successfully" });
            }
            
            var errorMsg = _db.GetLastError();
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to add item" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception adding item: {ex.Message}");
            return StatusCode(500, new { success = false, message = "An error occurred while adding the item" });
        }
    }

    /// <summary>
    /// Updates a checklist item's completion status
    /// PATCH /checklists/items/{id}
    /// </summary>
    [Authorize]
    [HttpPatch("items/{id}")]
    public IActionResult UpdateItem(int id, [FromBody] UpdateItemRequest req)
    {
        try
        {
            Console.WriteLine($"📝 Updating checklist item {id}: is_done = {req.is_done}");
            
            var ok = _db.UpdateChecklistItem(id, req.is_done);
            
            if (ok)
            {
                Console.WriteLine($"✅ Checklist item {id} updated successfully");
                return Ok(new { success = true, message = "Item updated successfully" });
            }
            
            var errorMsg = _db.GetLastError();
            Console.WriteLine($"✗ Failed to update checklist item {id}: {errorMsg}");
            return StatusCode(500, new { success = false, message = string.IsNullOrWhiteSpace(errorMsg) ? "Failed to update item" : errorMsg });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception updating item {id}: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { success = false, message = $"An error occurred: {ex.Message}" });
        }
    }

    public record UpdateItemRequest(bool is_done);
}
