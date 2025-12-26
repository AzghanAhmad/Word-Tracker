using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WordTracker.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Get configuration with environment variable PRIORITY (for Railway deployment)
// Environment variables take precedence over appsettings.json
var secret = Environment.GetEnvironmentVariable("JWT_SECRET") 
    ?? builder.Configuration["Jwt:Secret"] 
    ?? "dev_secret";
var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION") 
    ?? builder.Configuration.GetConnectionString("Default") 
    ?? "";

Console.WriteLine($"🔍 DB_CONNECTION env var exists: {!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DB_CONNECTION"))}");
Console.WriteLine($"🔍 JWT_SECRET env var exists: {!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("JWT_SECRET"))}");

// Extract database name from connection string for initialization
var dbName = "word_tracker";
if (connectionString.Contains("Database="))
{
    var dbMatch = System.Text.RegularExpressions.Regex.Match(connectionString, @"Database=([^;]+)");
    if (dbMatch.Success)
        dbName = dbMatch.Groups[1].Value;
}


// Initialize database on startup (non-blocking)
if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("⚠️ WARNING: No database connection string found!");
    Console.WriteLine("   Set DB_CONNECTION environment variable or configure in appsettings.json");
}
else
{
    // Initialize database asynchronously without blocking startup
    _ = Task.Run(async () =>
    {
        try
        {
            Console.WriteLine($"🔌 Attempting to connect to database: {dbName}");
            var dbInit = new DbInitService(connectionString, dbName);
            await dbInit.InitializeDatabaseAsync();
            Console.WriteLine($"✅ Database '{dbName}' initialized successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Database initialization failed: {ex.Message}");
            Console.WriteLine($"   Stack trace: {ex.StackTrace}");
            Console.WriteLine("⚠️ The application will continue, but database operations may fail.");
        }
    });
}

builder.Services.AddSingleton<IAuthService>(new AuthService(secret));
builder.Services.AddSingleton<IDbService>(new DbService(connectionString));
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
        ValidateLifetime = true
    };
});
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// Serve static files from frontend dist folder (for production deployment)
// Check multiple possible paths for frontend files
var possiblePaths = new[]
{
    Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
    Path.Combine(AppContext.BaseDirectory, "wwwroot"),
    Path.Combine(Directory.GetCurrentDirectory(), "frontend", "dist", "word-tracker-frontend", "browser"),
    Path.Combine(AppContext.BaseDirectory, "frontend", "dist", "word-tracker-frontend", "browser"),
    "/app/wwwroot",
    "/app/frontend/dist/word-tracker-frontend/browser"
};

string? frontendPath = null;
foreach (var path in possiblePaths)
{
    Console.WriteLine($"Checking frontend path: {path}");
    if (Directory.Exists(path))
    {
        frontendPath = path;
        Console.WriteLine($"✅ Found frontend at: {path}");
        break;
    }
}

if (frontendPath != null)
{
    var fileProvider = new PhysicalFileProvider(frontendPath);
    
    // Use default files (index.html) for root path
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = fileProvider
    });
    
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = fileProvider,
        RequestPath = ""
    });
    
    Console.WriteLine($"📁 Serving static files from: {frontendPath}");
}
else
{
    Console.WriteLine("⚠️  Frontend static files not found. API-only mode.");
    Console.WriteLine($"Current directory: {Directory.GetCurrentDirectory()}");
    Console.WriteLine($"Base directory: {AppContext.BaseDirectory}");
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint (available after CORS but before auth requirement)
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Map API controllers with /api prefix using route group
app.MapGroup("api").MapControllers();

// Fallback to index.html for Angular routing (SPA)
if (frontendPath != null)
{
    app.MapFallback(async context =>
    {
        // Don't fallback for API routes
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new { error = "API endpoint not found" });
            return;
        }
        
        // Serve index.html for all other routes (Angular routing)
        var indexPath = Path.Combine(frontendPath, "index.html");
        if (File.Exists(indexPath))
        {
            context.Response.ContentType = "text/html";
            await context.Response.SendFileAsync(indexPath);
        }
        else
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsync("Frontend not found");
        }
    });
}

// Use Railway's PORT environment variable
// This must be done BEFORE app.Run() and AFTER all middleware configuration
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    // Railway sets PORT - use it and clear any Kestrel config from appsettings
    var url = $"http://0.0.0.0:{port}";
    app.Urls.Clear();
    app.Urls.Add(url);
    Console.WriteLine($"🌐 Railway PORT detected: {port}, binding to {url}");
}
else
{
    // Local development - use default
    var url = "http://0.0.0.0:8080";
    app.Urls.Clear();
    app.Urls.Add(url);
    Console.WriteLine($"🌐 Using default port: 8080");
}

Console.WriteLine($"📂 Working directory: {Directory.GetCurrentDirectory()}");
Console.WriteLine($"📦 Base directory: {AppContext.BaseDirectory}");
Console.WriteLine($"🚀 Word Tracker API starting");
Console.WriteLine($"📊 Database: {dbName}");
Console.WriteLine($"🔐 JWT Secret: {(secret.Length > 20 ? secret.Substring(0, 20) + "..." : secret)}");
Console.WriteLine($"🔗 Connection String: {(connectionString.Contains("Password=") ? connectionString.Substring(0, connectionString.IndexOf("Password=")) + "Password=***" : connectionString)}");

app.Run();
