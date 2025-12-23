using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WordTracker.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Get configuration with environment variable support
var secret = builder.Configuration["Jwt:Secret"] ?? Environment.GetEnvironmentVariable("JWT_SECRET") ?? "dev_secret";
var connectionString = builder.Configuration.GetConnectionString("Default") ?? Environment.GetEnvironmentVariable("DB_CONNECTION") ?? "";

// Extract database name from connection string for initialization
var dbName = "word_tracker";
if (connectionString.Contains("Database="))
{
    var dbMatch = System.Text.RegularExpressions.Regex.Match(connectionString, @"Database=([^;]+)");
    if (dbMatch.Success)
        dbName = dbMatch.Groups[1].Value;
}

// Initialize database on startup
try
{
    var dbInit = new DbInitService(connectionString, dbName);
    dbInit.InitializeDatabaseAsync().GetAwaiter().GetResult();
}
catch (Exception ex)
{
    Console.WriteLine($"Warning: Database initialization failed: {ex.Message}");
    Console.WriteLine("The application will continue, but database operations may fail.");
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
    Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", "frontend", "dist", "word-tracker-frontend", "browser"),
    Path.Combine(AppContext.BaseDirectory, "frontend", "dist", "word-tracker-frontend", "browser")
};

string? frontendPath = null;
foreach (var path in possiblePaths)
{
    if (Directory.Exists(path))
    {
        frontendPath = path;
        break;
    }
}

if (frontendPath != null)
{
    var fileProvider = new PhysicalFileProvider(frontendPath);
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = fileProvider,
        RequestPath = ""
    });
    
    // Fallback to index.html for Angular routing
    app.MapFallbackToFile("index.html", new StaticFileOptions
    {
        FileProvider = fileProvider
    });
    Console.WriteLine($"📁 Serving static files from: {frontendPath}");
}
else
{
    Console.WriteLine("⚠️  Frontend static files not found. API-only mode.");
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Map API controllers with /api prefix using route group
app.MapGroup("api").MapControllers();

// Also map root route for health check
app.MapGet("/", () => Results.Ok(new { message = "Word Tracker API", status = "running" }));
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Use Railway's PORT environment variable or default to 8080
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
var url = $"http://0.0.0.0:{port}";
app.Urls.Add(url);

Console.WriteLine($"🚀 Word Tracker API starting on {url}");
Console.WriteLine($"📊 Database: {dbName}");
Console.WriteLine($"🔐 JWT Secret: {(secret.Length > 20 ? secret.Substring(0, 20) + "..." : secret)}");

app.Run();
