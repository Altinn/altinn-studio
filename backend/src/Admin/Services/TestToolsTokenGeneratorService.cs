using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Text;
using Admin.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Admin.Services;

public class TestToolsTokenGeneratorService
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly TestToolsTokenGeneratorSettings _tokenGeneratorSettings;

    public TestToolsTokenGeneratorService(
        HttpClient httpClient,
        IMemoryCache cache,
        IOptions<TestToolsTokenGeneratorSettings> tokenGeneratorSettings
    )
    {
        _httpClient = httpClient;
        _cache = cache;
        _tokenGeneratorSettings = tokenGeneratorSettings.Value;
    }

    public async Task<string> GetTestToken(string org, string env)
    {
        if (env == "production")
        {
            throw new NotSupportedException(
                "Environment 'production' is not supported by TestToolsTokenGeneratorService."
            );
        }

        if (
            string.IsNullOrEmpty(_tokenGeneratorSettings.Username)
            || string.IsNullOrEmpty(_tokenGeneratorSettings.Password)
        )
        {
            throw new InvalidOperationException("Missing auth credentials for AltinnTestTools.");
        }

        var token = await _cache.GetOrCreateAsync(
            $"TestToolsTokenGeneratorService:TestToken:{org}:{env}",
            async entry =>
            {
                var credentials = Encoding.UTF8.GetBytes(
                    $"{_tokenGeneratorSettings.Username}:{_tokenGeneratorSettings.Password}"
                );
                var base64Credentials = Convert.ToBase64String(credentials);

                var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    $"https://altinn-testtools-token-generator.azurewebsites.net/api/GetEnterpriseToken?org={org}&env={env}&scopes=altinn:serviceowner/instances.read"
                );
                request.Headers.Authorization = new AuthenticationHeaderValue(
                    "Basic",
                    base64Credentials
                );
                var response = await _httpClient.SendAsync(request);

                response.EnsureSuccessStatusCode();

                var token = await response.Content.ReadAsStringAsync();
                if (string.IsNullOrEmpty(token))
                {
                    throw new InvalidOperationException(
                        "Token generator response content was empty."
                    );
                }

                var tokenExpiration = GetJwtExpiration(token);
                entry.SetAbsoluteExpiration(tokenExpiration - TimeSpan.FromMinutes(1));

                return token;
            }
        );

        if (token == null)
        {
            throw new InvalidOperationException("Cache returned null unexpectedly.");
        }

        return token!;
    }

    private DateTimeOffset GetJwtExpiration(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        var expClaim = jwt.Claims.FirstOrDefault(c => c.Type == "exp")?.Value;
        if (expClaim == null || !long.TryParse(expClaim, out var expUnix))
        {
            throw new InvalidOperationException("JWT does not contain a valid 'exp' claim.");
        }
        return DateTimeOffset.FromUnixTimeSeconds(expUnix);
    }
}
