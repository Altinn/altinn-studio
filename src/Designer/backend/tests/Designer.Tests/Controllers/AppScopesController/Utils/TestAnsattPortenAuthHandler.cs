using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Designer.Tests.Controllers.AppScopesController.Utils;

public class TestAnsattPortenAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAnsattPortenAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorizationDetails = new[]
        {
            new
            {
                type = "ansattporten:altinn:service",
                resource = "urn:altinn:resource:5613:1",
                reportees = new[]
                {
                    new { ID = "0192:991825827" }
                }
            }
        };

        var header = new JwtHeader();
        var payload = new JwtPayload
        {
            { "iss", "test" },
            { "aud", "test" },
            { "sub", "testUser" },
            { "exp", new DateTimeOffset(DateTime.UtcNow.AddHours(1)).ToUnixTimeSeconds() },
            { "authorization_details", JsonSerializer.SerializeToElement(authorizationDetails) }
        };

        var token = new JwtSecurityToken(header, payload);
        var handler = new JwtSecurityTokenHandler();
        var accessToken = handler.WriteToken(token);

        var properties = new AuthenticationProperties();
        properties.StoreTokens(new[]
        {
            new AuthenticationToken { Name = "access_token", Value = accessToken }
        });

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, "testUser")
        };

        var identity = new ClaimsIdentity(claims, TestAuthConstants.TestAuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, properties, TestAuthConstants.TestAuthenticationScheme);

        var result = AuthenticateResult.Success(ticket);

        return Task.FromResult(result);
    }
}
