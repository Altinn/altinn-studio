using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;

public class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IApiKeyService _apiKeyService;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IApiKeyService apiKeyService)
        : base(options, logger, encoder)
    {
        _apiKeyService = apiKeyService;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(ApiKeyAuthenticationDefaults.HeaderName, out var headerValue))
        {
            return AuthenticateResult.NoResult();
        }

        string? rawKey = headerValue.ToString();
        if (string.IsNullOrWhiteSpace(rawKey))
        {
            return AuthenticateResult.Fail("API key header is empty.");
        }

        var apiKey = await _apiKeyService.ValidateAsync(rawKey);
        if (apiKey is null)
        {
            return AuthenticateResult.Fail("Invalid or expired API key.");
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, apiKey.Username),
            new Claim("preferred_username", apiKey.Username),
        };

        var identity = new ClaimsIdentity(claims, ApiKeyAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, ApiKeyAuthenticationDefaults.AuthenticationScheme);

        return AuthenticateResult.Success(ticket);
    }
}
