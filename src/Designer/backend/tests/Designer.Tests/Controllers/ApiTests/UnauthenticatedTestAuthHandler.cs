using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Designer.Tests.Controllers.ApiTests;

/// <summary>
/// Authentication handler that never produces a principal, so requests reach the endpoint as anonymous.
/// </summary>
public class UnauthenticatedTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public UnauthenticatedTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder
    )
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync() =>
        Task.FromResult(AuthenticateResult.NoResult());
}
