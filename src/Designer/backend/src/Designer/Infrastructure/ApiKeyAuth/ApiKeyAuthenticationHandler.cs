using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;

public class ApiKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IApiKeyService apiKeyService
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
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

        var apiKey = await apiKeyService.ValidateAsync(rawKey);
        if (apiKey is null)
        {
            return AuthenticateResult.Fail("Invalid or expired token.");
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
