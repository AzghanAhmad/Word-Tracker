using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WordTracker.Api.Services;

// Clear default claim type mapping to keep JWT claims as is
System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

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


// Initialize database on startup
if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("⚠️ WARNING: No database connection string found!");
    Console.WriteLine("   Set DB_CONNECTION environment variable or configure in appsettings.json");
}
else
{
    try
    {
        Console.WriteLine($"🔌 Attempting to connect to database: {dbName}");
        var dbInit = new DbInitService(connectionString, dbName);
        // Start initialization in background to not block server startup
        _ = Task.Run(async () => {
            try {
                await dbInit.InitializeDatabaseAsync();
                Console.WriteLine($"✅ Database '{dbName}' initialized successfully");
            } catch (Exception ex) {
                Console.WriteLine($"❌ Background database initialization failed: {ex.Message}");
            }
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Database initialization failed: {ex.Message}");
        Console.WriteLine($"   Stack trace: {ex.StackTrace}");
        Console.WriteLine("⚠️ The application will continue, but database operations may fail.");
    }
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
    Path.Combine(Directory.GetCurrentDirectory(), "frontend", "dist", "word-tracker-frontend", "browser"),
    Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
    Path.Combine(AppContext.BaseDirectory, "frontend", "dist", "word-tracker-frontend", "browser"),
    Path.Combine(AppContext.BaseDirectory, "wwwroot"),
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

// Map API controllers with /api prefix using route group
app.MapGroup("api").MapControllers();

// Health check endpoint is provided by HomeController

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

// Use Railway's PORT environment variable or default to 8199 for local development
var port = Environment.GetEnvironmentVariable("PORT") ?? "8199";
var url = $"http://0.0.0.0:{port}";
app.Urls.Add(url);

Console.WriteLine($"🚀 Word Tracker API starting on {url}");
Console.WriteLine($"📊 Database: {dbName}");
Console.WriteLine($"🔐 JWT Secret: {(secret.Length > 20 ? secret.Substring(0, 20) + "..." : secret)}");
Console.WriteLine($"🔗 Connection String: {(connectionString.Contains("Password=") ? connectionString.Substring(0, connectionString.IndexOf("Password=")) + "Password=***" : connectionString)}");
Console.WriteLine($"📍 API Endpoints available at: http://localhost:{port}/api/auth/register and http://localhost:{port}/api/auth/login");

app.Run();
