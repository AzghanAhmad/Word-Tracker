using BCrypt.Net;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace WordTracker.Api.Services;

public class AuthService : IAuthService
{
    private readonly string _secret;
    private readonly JwtSecurityTokenHandler _handler = new();
    private readonly SymmetricSecurityKey _key;
    private readonly SigningCredentials _creds;

    public AuthService(string secret)
    {
        _secret = secret;
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        _creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
    }

    public string HashPassword(string password) => BCrypt.Net.BCrypt.HashPassword(password);

    public bool VerifyPassword(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);

    public string GenerateToken(int userId)
    {
        var claims = new[] { new Claim("user_id", userId.ToString()) };
        var token = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.AddDays(7), signingCredentials: _creds);
        return _handler.WriteToken(token);
    }

    public int ValidateToken(string token)
    {
        try
        {
            _handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = _key,
                ValidateLifetime = true
            }, out var validated);
            var jwt = (JwtSecurityToken)validated;
            var claim = jwt.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
            return int.TryParse(claim, out var id) ? id : -1;
        }
        catch
        {
            return -1;
        }
    }
}
