#nullable enable
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Moq;
using Xunit;

namespace Designer.Tests.Infrastructure.Authorization;

public class OrgAccessHandlerTests
{
    private const string TestOrgIdentifier = "ttd";
    private const string TestOrgNumber = "991825827";
    private const string OtherOrgNumber = "310461598";

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenHttpContextIsNull()
    {
        var handler = CreateHandler(null);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal();
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }

    [Fact]
    public void ExtractAuthorizedPartyOrgNumbers_ShouldReturnAuthorizedParties_FromAnsattportenResourceAccessToken()
    {
        var token = CreateJwtTokenWithAuthorizedParties([TestOrgNumber]);
        var handler = CreateHandler(null);

        var orgNumbers = handler.ExtractAuthorizedPartyOrgNumbers(token);

        Assert.Equal([TestOrgNumber], orgNumbers);
    }

    [Fact]
    public void ExtractAuthorizedPartyOrgNumbers_ShouldReturnAuthorizedParties_WhenAuthorizationDetailsIsJsonString()
    {
        var token = CreateJwtTokenWithAuthorizationDetailsAsString([TestOrgNumber]);
        var handler = CreateHandler(null);

        var orgNumbers = handler.ExtractAuthorizedPartyOrgNumbers(token);

        Assert.Equal([TestOrgNumber], orgNumbers);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenOrgRouteValueIsMissing()
    {
        var httpContextMock = CreateMockHttpContext(null, null);
        var handler = CreateHandler(httpContextMock);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenAccessTokenIsMissing()
    {
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, null);
        var handler = CreateHandler(httpContextMock);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenTokenHasNoAuthorizedParties()
    {
        var token = CreateJwtToken([]);
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(httpContextMock);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenAuthorizationDetailsHasNoResourceOrAuthorizedParties()
    {
        var token = CreateJwtTokenWithoutAuthorizedParties();
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(httpContextMock);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenOrgNotFoundInAltinnOrgs()
    {
        var authorizedParties = new[] { TestOrgNumber };
        var token = CreateJwtToken(authorizedParties);
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(
            httpContextMock,
            envService =>
            {
                envService.Setup(x => x.GetAltinnOrgNumber(TestOrgIdentifier)).ReturnsAsync((string?)null);
            }
        );

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldSucceed_WhenUserHasMatchingAuthorizedPartyOrgNumber()
    {
        var authorizedParties = new[] { TestOrgNumber };
        var token = CreateJwtToken(authorizedParties);
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(
            httpContextMock,
            envService =>
            {
                envService.Setup(x => x.GetAltinnOrgNumber(TestOrgIdentifier)).ReturnsAsync(TestOrgNumber);
            }
        );

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenUserHasNoMatchingAuthorizedPartyOrgNumber()
    {
        var authorizedParties = new[] { OtherOrgNumber };
        var token = CreateJwtToken(authorizedParties);
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(
            httpContextMock,
            envService =>
            {
                envService.Setup(x => x.GetAltinnOrgNumber(TestOrgIdentifier)).ReturnsAsync(TestOrgNumber);
            }
        );

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldSucceed_WhenUserHasMultipleAuthorizedPartiesWithMatch()
    {
        var authorizedParties = new[] { OtherOrgNumber, TestOrgNumber, "123456789" };
        var token = CreateJwtToken(authorizedParties);
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(
            httpContextMock,
            envService =>
            {
                envService.Setup(x => x.GetAltinnOrgNumber(TestOrgIdentifier)).ReturnsAsync(TestOrgNumber);
            }
        );

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldSucceed_ForTtdOrgUsingDigdirOrgNumber()
    {
        // ttd test org uses Digdir's org number (991825827)
        var authorizedParties = new[] { TestOrgNumber };
        var token = CreateJwtToken(authorizedParties);
        var httpContextMock = CreateMockHttpContext("ttd", token);
        var handler = CreateHandler(
            httpContextMock,
            envService =>
            {
                envService.Setup(x => x.GetAltinnOrgNumber("ttd")).ReturnsAsync(TestOrgNumber);
            }
        );

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenOrgNumberIsTooShort()
    {
        var token = CreateJwtTokenWithCustomAuthorizedParties(["0192:"]);
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(httpContextMock);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenOrgNumberMissingPrefix()
    {
        var token = CreateJwtTokenWithCustomAuthorizedParties(["991825827"]);
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(httpContextMock);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenTokenIsMalformed()
    {
        var token = "not.a.valid.jwt";
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(httpContextMock);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenAuthorizationDetailsIsInvalidJson()
    {
        var header = new JwtHeader();
        var payload = new JwtPayload
        {
            { "iss", "test" },
            { "aud", "test" },
            { "exp", new DateTimeOffset(DateTime.UtcNow.AddHours(1)).ToUnixTimeSeconds() },
            { "authorization_details", "{invalid json" },
        };

        var token = new JwtSecurityToken(header, payload);
        var jwtHandler = new JwtSecurityTokenHandler();
        var tokenString = jwtHandler.WriteToken(token);

        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, tokenString);
        var handler = CreateHandler(httpContextMock);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenOrgNumberIsEmptyString()
    {
        var token = CreateJwtTokenWithCustomAuthorizedParties([""]);
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var handler = CreateHandler(httpContextMock);

        var requirement = new OrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    private static HttpContext CreateMockHttpContext(string? orgRouteValue, string? accessToken)
    {
        var httpContext = new DefaultHttpContext();

        if (orgRouteValue != null)
        {
            httpContext.Request.RouteValues = new RouteValueDictionary { { "org", orgRouteValue } };
        }

        var authServiceMock = new Mock<IAuthenticationService>();
        if (accessToken != null)
        {
            var tokens = new AuthenticationProperties();
            tokens.StoreTokens(
                new[]
                {
                    new AuthenticationToken { Name = "access_token", Value = accessToken },
                }
            );

            var authenticateResult = AuthenticateResult.Success(
                new AuthenticationTicket(
                    new ClaimsPrincipal(new ClaimsIdentity()),
                    tokens,
                    CookieAuthenticationDefaults.AuthenticationScheme
                )
            );

            authServiceMock
                .Setup(x =>
                    x.AuthenticateAsync(It.IsAny<HttpContext>(), CookieAuthenticationDefaults.AuthenticationScheme)
                )
                .ReturnsAsync(authenticateResult);
        }
        else
        {
            authServiceMock
                .Setup(x =>
                    x.AuthenticateAsync(It.IsAny<HttpContext>(), CookieAuthenticationDefaults.AuthenticationScheme)
                )
                .ReturnsAsync(AuthenticateResult.NoResult());
        }

        var serviceProviderMock = new Mock<IServiceProvider>();
        serviceProviderMock.Setup(x => x.GetService(typeof(IAuthenticationService))).Returns(authServiceMock.Object);

        httpContext.RequestServices = serviceProviderMock.Object;

        return httpContext;
    }

    private static string CreateJwtToken(string[] orgNumbers)
    {
        return CreateJwtTokenWithAuthorizedParties(orgNumbers);
    }

    private static string CreateJwtTokenWithCustomAuthorizedParties(string[] ids)
    {
        var authorizationDetails = new[]
        {
            new
            {
                type = "ansattporten:altinn:resource",
                resource = "urn:altinn:resource:digdir-selvbetjening-klienter",
                authorized_parties = ids.Select(id => new
                {
                    orgno = new { authority = "iso6523-actorid-upis", ID = id },
                    resource = "digdir-selvbetjening-klienter",
                    name = "Test org",
                }),
            },
        };

        var header = new JwtHeader();
        var payload = new JwtPayload
        {
            { "iss", "test" },
            { "aud", "test" },
            { "exp", new DateTimeOffset(DateTime.UtcNow.AddHours(1)).ToUnixTimeSeconds() },
            { "authorization_details", JsonSerializer.SerializeToElement(authorizationDetails) },
        };

        var token = new JwtSecurityToken(header, payload);
        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(token);
    }

    private static string CreateJwtTokenWithoutAuthorizedParties()
    {
        var authorizationDetails = new[] { new { type = "ansattporten:altinn:resource" } };

        var header = new JwtHeader();
        var payload = new JwtPayload
        {
            { "iss", "test" },
            { "aud", "test" },
            { "exp", new DateTimeOffset(DateTime.UtcNow.AddHours(1)).ToUnixTimeSeconds() },
            { "authorization_details", JsonSerializer.SerializeToElement(authorizationDetails) },
        };

        var token = new JwtSecurityToken(header, payload);
        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(token);
    }

    private static string CreateJwtTokenWithAuthorizedParties(string[] orgNumbers)
    {
        var authorizationDetails = new[]
        {
            new
            {
                type = "ansattporten:altinn:resource",
                resource = "urn:altinn:resource:digdir-selvbetjening-klienter",
                authorized_parties = orgNumbers.Select(orgNo => new
                {
                    orgno = new { authority = "iso6523-actorid-upis", ID = $"0192:{orgNo}" },
                    resource = "digdir-selvbetjening-klienter",
                    name = "Test org",
                }),
            },
        };

        var header = new JwtHeader();
        var payload = new JwtPayload
        {
            { "iss", "test" },
            { "aud", "test" },
            { "exp", new DateTimeOffset(DateTime.UtcNow.AddHours(1)).ToUnixTimeSeconds() },
            { "authorization_details", JsonSerializer.SerializeToElement(authorizationDetails) },
        };

        var token = new JwtSecurityToken(header, payload);
        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(token);
    }

    private static string CreateJwtTokenWithAuthorizationDetailsAsString(string[] orgNumbers)
    {
        var authorizationDetails = new[]
        {
            new
            {
                type = "ansattporten:altinn:resource",
                resource = "urn:altinn:resource:digdir-selvbetjening-klienter",
                authorized_parties = orgNumbers.Select(orgNo => new
                {
                    orgno = new { authority = "iso6523-actorid-upis", ID = $"0192:{orgNo}" },
                    resource = "digdir-selvbetjening-klienter",
                    name = "Test org",
                }),
            },
        };

        var header = new JwtHeader();
        var payload = new JwtPayload
        {
            { "iss", "test" },
            { "aud", "test" },
            { "exp", new DateTimeOffset(DateTime.UtcNow.AddHours(1)).ToUnixTimeSeconds() },
            { "authorization_details", JsonSerializer.Serialize(authorizationDetails) },
        };

        var token = new JwtSecurityToken(header, payload);
        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(token);
    }

    private static OrgAccessHandler CreateHandler(
        HttpContext? httpContext,
        Action<Mock<IEnvironmentsService>>? configureEnvironmentsService = null
    )
    {
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        configureEnvironmentsService?.Invoke(environmentsServiceMock);

        return new OrgAccessHandler(httpContextAccessorMock.Object, environmentsServiceMock.Object);
    }
}
