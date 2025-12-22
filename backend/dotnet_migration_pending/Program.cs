using Microsoft.AspNetCore.Authentication.JwtBearer;
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

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Get port from configuration
var port = builder.Configuration["Kestrel:Endpoints:Http:Url"]?.Split(':').LastOrDefault()?.Split('/').FirstOrDefault() ?? "8080";
Console.WriteLine($"🚀 Word Tracker API starting on http://localhost:{port}");
Console.WriteLine($"📊 Database: {dbName}");
Console.WriteLine($"🔐 JWT Secret: {(secret.Length > 20 ? secret.Substring(0, 20) + "..." : secret)}");

app.Run();
