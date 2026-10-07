using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Designer.Tests.Controllers.ApiTests;

/// <summary>
/// Authentication handler that produces a principal authenticated the way <see cref="ApiKeyAuthenticationHandler"/>
/// does, so the <see cref="ApiKeyScopeFilter"/> treats the request as an API key request.
/// </summary>
public class ApiKeyTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public ApiKeyTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder
    )
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[] { new Claim(ClaimTypes.Name, "testUser") };
        var identity = new ClaimsIdentity(claims, ApiKeyAuthenticationDefaults.AuthenticationScheme);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
