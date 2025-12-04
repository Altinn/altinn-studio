using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Maskinporten;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Designer.Tests.Controllers.ControlPlaneController.Base;

internal sealed class MaskinportenTestAuthHandler : AuthenticationHandler<MaskinportenTestAuthOptions>
{
    public MaskinportenTestAuthHandler(
        IOptionsMonitor<MaskinportenTestAuthOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Options.ShouldAuthenticate)
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new[]
        {
            new Claim("iss", Options.Issuer ?? "https://test.maskinporten.no/"),
            new Claim(MaskinportenConstants.ScopeClaimType, Options.Scope ?? ""),
            new Claim("consumer", Options.Consumer ?? """{"ID": "test-org"}""")
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

internal sealed class MaskinportenTestAuthOptions : AuthenticationSchemeOptions
{
    public bool ShouldAuthenticate { get; set; } = true;
    public string Scope { get; set; }
    public string Issuer { get; set; }
    public string Consumer { get; set; }
}
