namespace WordTracker.Api.Services;

public interface IAuthService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
    string GenerateToken(int userId);
    int ValidateToken(string token);
}
