using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features.Maskinporten.Models;
using App;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

const string secretPath = "/mnt/app-secrets/maskinporten-settings.json";
const string secretDir = "/mnt/app-secrets";

var builder = WebApplication.CreateBuilder(args);

// Add maskinporten-settings.json to configuration (same pattern as real apps)
// Always register the file provider - optional:true handles missing file,
// and reloadOnChange:true picks up the file when operator creates it
if (Directory.Exists(secretDir))
{
    builder.Configuration.AddJsonFile(
        provider: new PhysicalFileProvider(secretDir),
        path: "maskinporten-settings.json",
        optional: true,
        reloadOnChange: true
    );
}

// Bind MaskinportenSettings from configuration section (same as real apps)
builder.Services
    .AddOptions<MaskinportenSettings>()
    .BindConfiguration("MaskinportenSettings")
    .ValidateDataAnnotations();

builder.Services.AddHostedService<Worker>();
builder.Services.AddHttpClient();

var app = builder.Build();

app.MapGet("/health", () => TypedResults.Ok());

app.MapGet("/ttd/localtestapp/token", async (
    HttpContext context,
    IHttpClientFactory httpClientFactory,
    IOptionsMonitor<MaskinportenSettings> optionsMonitor,
    ILoggerFactory loggerFactory) =>
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
        var settings = optionsMonitor.CurrentValue;

        if (string.IsNullOrEmpty(settings.ClientId))
        {
            return Results.Json(new { success = false, error = "ClientId is empty in settings" });
        }

        if (string.IsNullOrEmpty(settings.Authority))
        {
            return Results.Json(new { success = false, error = "Authority is empty in settings" });
        }

        // Get JsonWebKey from settings (uses Jwk or JwkBase64)
        JsonWebKey jwk;
        try
        {
            jwk = settings.GetJsonWebKey();
        }
        catch (Exception ex)
        {
            return Results.Json(new { success = false, error = $"Failed to get JWK: {ex.Message}" });
        }

        var credentials = new SigningCredentials(jwk, SecurityAlgorithms.RsaSha512);

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
        const string postgresSecretPath = "/mnt/app-secrets/postgresql.json";
        if (!File.Exists(postgresSecretPath))
        {
            return Results.Json(new { success = false, error = $"Secret file not found at {postgresSecretPath}" });
        }

        var json = await File.ReadAllTextAsync(postgresSecretPath);
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
        return Results.Json(new { success = true, result });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database check failed");
        return Results.Json(new { success = false, error = ex.Message });
    }
});

app.Run();

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
