using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using App;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHostedService<Worker>();
builder.Services.AddHttpClient();

var app = builder.Build();

app.MapGet("/health", () => TypedResults.Ok());

app.MapGet("/ttd/localtestapp/token", async (HttpContext context, IHttpClientFactory httpClientFactory, ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("App");
    logger.LogInformation("Received token request with scope: {scope}", context.Request.Query["scope"].ToString());

    var scope = context.Request.Query["scope"].ToString();
    if (string.IsNullOrEmpty(scope))
    {
        return Results.Json(new { success = false, error = "Missing 'scope' query parameter" });
    }

    try
    {
        // Read the maskinporten-settings.json from mounted secret
        const string secretPath = "/mnt/app-secrets/maskinporten-settings.json";
        if (!File.Exists(secretPath))
        {
            return Results.Json(new { success = false, error = $"Secret file not found at {secretPath}" });
        }

        var settingsJson = await File.ReadAllTextAsync(secretPath);
        var settings = JsonSerializer.Deserialize<MaskinportenSettings>(settingsJson);
        if (settings == null)
        {
            return Results.Json(new { success = false, error = "Failed to deserialize settings" });
        }

        if (string.IsNullOrEmpty(settings.ClientId))
        {
            return Results.Json(new { success = false, error = "ClientId is empty in settings" });
        }

        if (settings.Jwk == null)
        {
            return Results.Json(new { success = false, error = "JWK is null in settings" });
        }

        // Create RSA key from JWK
        var rsa = RSA.Create();
        var rsaParams = new RSAParameters
        {
            Modulus = Base64UrlDecode(settings.Jwk.N),
            Exponent = Base64UrlDecode(settings.Jwk.E),
            D = Base64UrlDecode(settings.Jwk.D),
            P = Base64UrlDecode(settings.Jwk.P),
            Q = Base64UrlDecode(settings.Jwk.Q),
            DP = Base64UrlDecode(settings.Jwk.Dp),
            DQ = Base64UrlDecode(settings.Jwk.Dq),
            InverseQ = Base64UrlDecode(settings.Jwk.Qi)
        };
        rsa.ImportParameters(rsaParams);

        var securityKey = new RsaSecurityKey(rsa) { KeyId = settings.Jwk.Kid };
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.RsaSha256);

        // Create JWT assertion
        var now = DateTime.UtcNow;
        var claims = new[]
        {
            new Claim("scope", scope),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = settings.ClientId,
            Audience = settings.Authority,
            Expires = now.AddSeconds(60),
            IssuedAt = now,
            NotBefore = now,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtToken = tokenHandler.CreateToken(tokenDescriptor);
        var assertion = tokenHandler.WriteToken(jwtToken);

        // Call the Maskinporten token endpoint
        var httpClient = httpClientFactory.CreateClient();
        var tokenUrl = $"http://fakes.runtime-operator.svc.cluster.local:8050/token?grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion={Uri.EscapeDataString(assertion)}";

        var response = await httpClient.PostAsync(tokenUrl, null);
        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            return Results.Json(new { success = false, error = $"Token endpoint returned {response.StatusCode}: {responseContent}" });
        }

        var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(responseContent);
        if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
        {
            return Results.Json(new { success = false, error = "Failed to parse token response" });
        }

        // Decode the access token (it's base64-encoded JSON in the fake)
        var decodedToken = Encoding.UTF8.GetString(Convert.FromBase64String(tokenResponse.AccessToken));
        var tokenClaims = JsonSerializer.Deserialize<FakeTokenClaims>(decodedToken);

        return Results.Json(new
        {
            success = true,
            claims = tokenClaims
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new { success = false, error = ex.Message });
    }
});

app.MapGet("/ttd/localtestapp/dbcheck", async (ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("App");
    logger.LogInformation("Received dbcheck request");

    try
    {
        const string secretPath = "/mnt/app-secrets/postgresql.json";
        if (!File.Exists(secretPath))
        {
            return Results.Json(new { success = false, error = $"Secret file not found at {secretPath}" });
        }

        var json = await File.ReadAllTextAsync(secretPath);
        var root = JsonSerializer.Deserialize<PostgresJsonRoot>(json);
        if (root?.PostgreSQL?.ConnectionString == null)
        {
            return Results.Json(new { success = false, error = "Failed to parse ConnectionString" });
        }

        await using var conn = new NpgsqlConnection(root.PostgreSQL.ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand("SELECT 1", conn);
        var result = await cmd.ExecuteScalarAsync();

        logger.LogInformation("Database check succeeded, result: {result}", result);
        return Results.Json(new { success = true, result = result });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database check failed");
        return Results.Json(new { success = false, error = ex.Message });
    }
});

app.Run();

static byte[] Base64UrlDecode(string? input)
{
    if (string.IsNullOrEmpty(input))
        return Array.Empty<byte>();

    // Convert base64url to base64
    var base64 = input.Replace('-', '+').Replace('_', '/');
    switch (base64.Length % 4)
    {
        case 2: base64 += "=="; break;
        case 3: base64 += "="; break;
    }
    return Convert.FromBase64String(base64);
}

public class MaskinportenSettings
{
    [JsonPropertyName("clientId")]
    public string? ClientId { get; set; }

    [JsonPropertyName("authority")]
    public string? Authority { get; set; }

    [JsonPropertyName("jwk")]
    public JwkKey? Jwk { get; set; }
}

public class JwkKey
{
    [JsonPropertyName("kty")]
    public string? Kty { get; set; }

    [JsonPropertyName("kid")]
    public string? Kid { get; set; }

    [JsonPropertyName("n")]
    public string? N { get; set; }

    [JsonPropertyName("e")]
    public string? E { get; set; }

    [JsonPropertyName("d")]
    public string? D { get; set; }

    [JsonPropertyName("p")]
    public string? P { get; set; }

    [JsonPropertyName("q")]
    public string? Q { get; set; }

    [JsonPropertyName("dp")]
    public string? Dp { get; set; }

    [JsonPropertyName("dq")]
    public string? Dq { get; set; }

    [JsonPropertyName("qi")]
    public string? Qi { get; set; }
}

public class TokenResponse
{
    [JsonPropertyName("access_token")]
    public string? AccessToken { get; set; }

    [JsonPropertyName("token_type")]
    public string? TokenType { get; set; }

    [JsonPropertyName("scope")]
    public string? Scope { get; set; }

    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }
}

public class FakeTokenClaims
{
    [JsonPropertyName("scopes")]
    public string[]? Scopes { get; set; }

    [JsonPropertyName("client_id")]
    public string? ClientId { get; set; }
}

public class PostgresJsonRoot
{
    [JsonPropertyName("PostgreSQL")]
    public PostgresConfig? PostgreSQL { get; set; }
}

public class PostgresConfig
{
    [JsonPropertyName("ConnectionString")]
    public string? ConnectionString { get; set; }
}
