namespace WordTracker.Api;

/// <summary>
/// Resolves MySQL connection string for Railway (DB_CONNECTION, MYSQL_*, or DATABASE_URL).
/// </summary>
public static class ConnectionStringResolver
{
    public static string Resolve(IConfiguration configuration)
    {
        var direct = Environment.GetEnvironmentVariable("DB_CONNECTION");
        if (!string.IsNullOrWhiteSpace(direct))
            return direct.Trim();

        var fromUrl = ParseMysqlUrl(
            Environment.GetEnvironmentVariable("MYSQL_URL")
            ?? Environment.GetEnvironmentVariable("DATABASE_URL"));
        if (!string.IsNullOrWhiteSpace(fromUrl))
            return fromUrl;

        var host = FirstNonEmpty(
            Environment.GetEnvironmentVariable("MYSQLHOST"),
            Environment.GetEnvironmentVariable("MYSQL_HOST"),
            Environment.GetEnvironmentVariable("DB_HOST"));
        var port = FirstNonEmpty(
            Environment.GetEnvironmentVariable("MYSQLPORT"),
            Environment.GetEnvironmentVariable("MYSQL_PORT"),
            Environment.GetEnvironmentVariable("DB_PORT")) ?? "3306";
        var user = FirstNonEmpty(
            Environment.GetEnvironmentVariable("MYSQLUSER"),
            Environment.GetEnvironmentVariable("MYSQL_USER"),
            Environment.GetEnvironmentVariable("DB_USER")) ?? "root";
        var password = FirstNonEmpty(
            Environment.GetEnvironmentVariable("MYSQLPASSWORD"),
            Environment.GetEnvironmentVariable("MYSQL_PASSWORD"),
            Environment.GetEnvironmentVariable("DB_PASSWORD"));
        var database = FirstNonEmpty(
            Environment.GetEnvironmentVariable("MYSQLDATABASE"),
            Environment.GetEnvironmentVariable("MYSQL_DATABASE"),
            Environment.GetEnvironmentVariable("DB_NAME")) ?? "railway";

        if (!string.IsNullOrWhiteSpace(host) && !string.IsNullOrWhiteSpace(password))
        {
            return $"Server={host};Port={port};Database={database};User={user};Password={password};SslMode=Required;";
        }

        return configuration.GetConnectionString("Default") ?? "";
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
            if (!string.IsNullOrWhiteSpace(v))
                return v.Trim();
        return null;
    }

    /// <summary>
    /// mysql://user:pass@host:port/database → MySqlConnector connection string
    /// </summary>
    public static string? ParseMysqlUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        url = url.Trim();

        if (!url.StartsWith("mysql://", StringComparison.OrdinalIgnoreCase))
            return null;

        try
        {
            var uri = new Uri(url);
            var userInfo = uri.UserInfo.Split(':', 2);
            var user = Uri.UnescapeDataString(userInfo[0]);
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 3306;
            var database = uri.AbsolutePath.TrimStart('/');
            if (string.IsNullOrEmpty(database)) database = "railway";

            return $"Server={host};Port={port};Database={database};User={user};Password={password};SslMode=Required;";
        }
        catch
        {
            return null;
        }
    }
}
