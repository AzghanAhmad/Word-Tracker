using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WordTracker.Api.Services;
using WordTracker.Api.Middleware;

// Clear default claim type mapping to keep JWT claims as is
System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to use Railway's PORT before building
var port = Environment.GetEnvironmentVariable("PORT") ?? "5200";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
Console.WriteLine($"🔧 Setting Kestrel to listen on port: {port}");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Get configuration with environment variable PRIORITY (for Railway deployment)
// Environment variables take precedence over appsettings.json
var jwtSecretEnv = Environment.GetEnvironmentVariable("JWT_SECRET");
var jwtSecretConfig = builder.Configuration["Jwt:Secret"];
var secret = jwtSecretEnv 
    ?? jwtSecretConfig 
    ?? "dev_secret_must_be_at_least_32_bytes_long_for_hs256_security_algorithm"; // Fallback must be long enough

var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION") 
    ?? builder.Configuration.GetConnectionString("Default") 
    ?? "";

// Ensure connection string has zero date handling parameters
if (!string.IsNullOrEmpty(connectionString) && !connectionString.Contains("AllowZeroDateTime"))
{
    connectionString += (connectionString.EndsWith(";") ? "" : ";") + "AllowZeroDateTime=True;ConvertZeroDateTime=True;";
}

Console.WriteLine($"🔍 DB_CONNECTION env var exists: {!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DB_CONNECTION"))}");
Console.WriteLine($"🔍 JWT_SECRET env var exists: {!string.IsNullOrEmpty(jwtSecretEnv)}");
Console.WriteLine($"🔍 AppSettings Jwt:Secret found: {!string.IsNullOrEmpty(jwtSecretConfig)}");
Console.WriteLine($"🔑 Using JWT Secret with length: {secret.Length} bytes");

// Extract database name from connection string for initialization
var dbName = "word_tracker";
if (connectionString.Contains("Database="))
{
    var dbMatch = System.Text.RegularExpressions.Regex.Match(connectionString, @"Database=([^;]+)");
    if (dbMatch.Success)
        dbName = dbMatch.Groups[1].Value;
}


// Initialize database on startup (synchronous to ensure tables exist before server starts)
if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("⚠️ WARNING: No database connection string found!");
    Console.WriteLine("   Set DB_CONNECTION environment variable or configure in appsettings.json");
    Console.WriteLine("   The application will start, but database operations will fail.");
}
else
{
    try
    {
        Console.WriteLine($"🔌 Attempting to connect to database: {dbName}");
        var dbInit = new DbInitService(connectionString, dbName);
        
        // Initialize database synchronously with timeout to ensure tables exist
        Console.WriteLine("📦 Initializing database schema...");
        var initTask = dbInit.InitializeDatabaseAsync();
        
        // Wait up to 30 seconds for initialization
        if (initTask.Wait(TimeSpan.FromSeconds(30)))
        {
            Console.WriteLine($"✅ Database '{dbName}' initialized successfully");
        }
        else
        {
            Console.WriteLine("⚠️ Database initialization is taking longer than expected...");
            Console.WriteLine("   Continuing startup, but some operations may fail if tables don't exist yet.");
            // Continue in background
            _ = Task.Run(async () => {
                try {
                    await initTask;
                    Console.WriteLine($"✅ Database '{dbName}' initialization completed");
                } catch (Exception ex) {
                    Console.WriteLine($"❌ Background database initialization failed: {ex.Message}");
                }
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Database initialization failed: {ex.Message}");
        Console.WriteLine($"   Stack trace: {ex.StackTrace}");
        Console.WriteLine("⚠️ The application will continue, but database operations may fail.");
        Console.WriteLine("   Tables will be created automatically on first use if possible.");
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
// ALWAYS enable developer exception page (temporarily for debugging 500 errors)
app.UseDeveloperExceptionPage();
/*
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
*/

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
}

// Ensure uploads directory is served even if frontend dist is missing
var currentDir = Directory.GetCurrentDirectory();
var uploadsPossiblePaths = new[]
{
    Path.Combine(currentDir, "wwwroot", "uploads"),
    Path.Combine(currentDir, "backend", "dotnet_migration_pending", "wwwroot", "uploads"),
    Path.Combine(AppContext.BaseDirectory, "wwwroot", "uploads")
};

foreach (var uploadsPath in uploadsPossiblePaths)
{
    if (Directory.Exists(uploadsPath))
    {
        Console.WriteLine($"📂 Serving uploads from: {uploadsPath}");
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
            RequestPath = "/uploads"
        });
        break; // Stop at first found
    }
}

if (frontendPath != null)
{
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

// Add login tracking middleware (records login on every authenticated request)
// This ensures any authenticated activity counts as "logging in" for streak purposes
app.UseMiddleware<LoginTrackingMiddleware>();

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

// Log the final listening URL (already configured above via UseUrls)
var finalPort = Environment.GetEnvironmentVariable("PORT") ?? "5200";
var url = $"http://0.0.0.0:{finalPort}";

Console.WriteLine($"🚀 Word Tracker API starting on {url}");
Console.WriteLine($"📊 Database: {dbName}");
Console.WriteLine($"🔐 JWT Secret: {(secret.Length > 20 ? secret.Substring(0, 20) + "..." : secret)}");
Console.WriteLine($"🔗 Connection String: {(connectionString.Contains("Password=") ? connectionString.Substring(0, connectionString.IndexOf("Password=")) + "Password=***" : connectionString)}");
Console.WriteLine($"📍 API Endpoints available at: http://localhost:{finalPort}/api/auth/register and http://localhost:{finalPort}/api/auth/login");

app.Run();
