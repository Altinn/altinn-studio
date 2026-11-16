using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using LocalTest.Configuration;
using LocalTest.Controllers.Authentication;
using LocalTest.Services.Authentication.Interface;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Xunit;

namespace LocalTest.Tests.Authentication;

public class AuthenticationControllerTests
{
    [Fact]
    public async Task GenerateOrgToken_WritesTheOrgNumberAsAString()
    {
        // Apps reject a service owner token whose org number claim is not a JSON string
        var authentication = new Mock<IAuthentication>();
        authentication
            .Setup(service => service.GenerateToken(It.IsAny<ClaimsPrincipal>()))
            .Returns((ClaimsPrincipal principal) => UnsignedToken(principal));
        var controller = new AuthenticationController(
            NullLogger<AuthenticationController>.Instance,
            Options.Create(new GeneralSettings()),
            authentication.Object
        );

        ActionResult result = await controller.GenerateOrgToken(org: "ttd", orgNumber: 991825827);

        string token = Assert.IsType<string>(Assert.IsType<OkObjectResult>(result).Value);
        JsonElement orgNumber = Payload(token).GetProperty("urn:altinn:orgNumber");
        Assert.Equal(JsonValueKind.String, orgNumber.ValueKind);
        Assert.Equal("991825827", orgNumber.GetString());
    }

    /// <summary>
    /// Serializes the claims the way <c>AuthenticationService.GenerateToken</c> does, without the signing certificate.
    /// </summary>
    private static string UnsignedToken(ClaimsPrincipal principal)
    {
        var handler = new JwtSecurityTokenHandler();
        var descriptor = new SecurityTokenDescriptor { Subject = new ClaimsIdentity(principal.Identity) };
        return handler.WriteToken(handler.CreateToken(descriptor));
    }

    private static JsonElement Payload(string token) =>
        JsonDocument.Parse(Base64UrlEncoder.Decode(token.Split('.')[1])).RootElement;
}
