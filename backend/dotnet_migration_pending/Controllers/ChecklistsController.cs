using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordTracker.Api.Services;

namespace WordTracker.Api.Controllers;

[ApiController]
[Route("")]
public class ChecklistsController : ControllerBase
{
    private readonly IDbService _db;
    public ChecklistsController(IDbService db) { _db = db; }
    private int UserId() => int.Parse(User.Claims.First(c => c.Type == "user_id").Value);

    public record CreateChecklistRequest(string name, int? plan_id);
    public record AddItemRequest(int checklist_id, string content);

    [Authorize]
    [HttpPost("checklists")]
    public IActionResult Create([FromBody] CreateChecklistRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.name)) return StatusCode(400, new { success = false, message = "Missing name" });
        var id = _db.CreateChecklist(UserId(), req.plan_id, req.name);
        if (id > 0) return StatusCode(201, new { success = true, message = "Checklist created", id });
        return StatusCode(500, new { success = false, message = "Failed to create checklist" });
    }

    [Authorize]
    [HttpGet("checklists")]
    public IActionResult Get()
    {
        var json = _db.GetChecklistsJson(UserId());
        var data = System.Text.Json.JsonSerializer.Deserialize<object>(json);
        return Ok(new { success = true, data });
    }

    [Authorize]
    [HttpDelete("checklists")]
    public IActionResult Delete([FromQuery] int? id)
    {
        if (id is null) return StatusCode(400, new { success = false, message = "Missing id" });
        var ok = _db.DeleteChecklist(id.Value, UserId());
        if (ok) return Ok(new { success = true, message = "Checklist deleted" });
        return StatusCode(500, new { success = false, message = "Failed to delete" });
    }

    [Authorize]
    [HttpPost("checklist_items")]
    public IActionResult AddItem([FromBody] AddItemRequest req)
    {
        if (req.checklist_id <= 0 || string.IsNullOrWhiteSpace(req.content)) return StatusCode(400, new { success = false, message = "Missing fields" });
        var ok = _db.AddChecklistItem(req.checklist_id, req.content);
        if (ok) return Ok(new { success = true, message = "Item added" });
        return StatusCode(500, new { success = false, message = "Failed to add item" });
    }
}
