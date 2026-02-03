using System;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Designer.Tests.Controllers.ApiTests;

public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[] { new Claim(ClaimTypes.Name, "testUser") };
        var identity = new ClaimsIdentity(claims, "testUser");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, TestAuthConstants.TestAuthenticationScheme);

        //Store the access token so GetDeveloperAppTokenAsync() can retrieve it
        ticket.Properties.StoreTokens(new[]
        {
            new AuthenticationToken
            {
                Name = "access_token",
                Value = "test-access-token-for-git-operations"
            }
        });

        var result = AuthenticateResult.Success(ticket);

        return Task.FromResult(result);
    }
}
