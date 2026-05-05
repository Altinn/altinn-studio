#nullable enable
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
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
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Infrastructure.Authorization;

public class OrgAccessHandlerTests
{
    private const string TestOrgIdentifier = "ttd";
    private const string TestOrgNumber = "991825827";
    private const string OtherOrgNumber = "310461598";
    private const string AccessTokenWithReportee =
        "eyJraWQiOiJiZFhMRVduRGpMSGpwRThPZnl5TUp4UlJLbVo3MUxCOHUxeUREbVBpdVQwIiwiYWxnIjoiUlMyNTYifQ."
        + "eyJzdWIiOiIyOTkwNjI5Njc2MiIsImNsbSI6WyIhd0FBQyJdLCJpc3MiOiJodHRwczovL3Rlc3QuYW5zYXR0cG9ydGVuLm5vIiwiY2xpZW50X2FtciI6ImNsaWVudF9zZWNyZXRfYmFzaWMiLCJwaWQiOiIyOTkwNjI5Njc2MiIsImNsaWVudF9pZCI6IjlhOTllOTZkLWI1NmMtNGY3NC1hNjg5LWY5MzZmNzFjODgxOSIsImFjciI6InN1YnN0YW50aWFsIiwic2lrIjoiZk84NmpoaHNVU0t4YWRpTXgtSmJ2czFGdkdqNFI0emtkaEx6M0JEYng4MCIsImF1dGhvcml6YXRpb25fZGV0YWlscyI6W3sicmVzb3VyY2UiOiJ1cm46YWx0aW5uOnJlc291cmNlOjI0ODA6NDAiLCJ0eXBlIjoiYW5zYXR0cG9ydGVuOmFsdGlubjpzZXJ2aWNlIiwicmVzb3VyY2VfbmFtZSI6IlByb2R1a3RlciBvZyB0amVuZXN0ZXIgZnJhIEJyw7hubsO4eXN1bmRyZWdpc3RyZW5lIiwicmVwb3J0ZWVzIjpbeyJSaWdodHMiOlsiUmVhZCIsIkFyY2hpdmVEZWxldGUiLCJBcmNoaXZlUmVhZCJdLCJBdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5MjozMTA4ODgxNjgiLCJOYW1lIjoiREVESUtFUlQgVkVOU1RSRSBUSUdFUiBBUyJ9XX1dLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIiwiZXhwIjoxNzc3OTY3Mzc5LCJpYXQiOjE3Nzc5NjY3NzksImp0aSI6IjNuQmJ2V0hwN19vIiwiY29uc3VtZXIiOnsiYXV0aG9yaXR5IjoiaXNvNjUyMy1hY3RvcmlkLXVwaXMiLCJJRCI6IjAxOTI6OTkxODI1ODI3In19."
        + "NkvxfzaTkQ5EdfaBBFBedM1NFJSE7d7i4QSk9RLYsCNloUn4rKMZ0Itss3vesBqr-bx44iXqVHFqWPBXak0KcTdT7ZcSyyeAvzS5hLelrlb-h4hBn8X6cyatKp6yhYJ67BH0ZiAaxFAVSnZul3xjr49wmOQoIqU2au_xGW97P1GsTEzHvmxzHnIYRDdot6ueWOPtR89tKk1rY4W4MT9Rb_T6Ia5UhKYweywp0rc3An-UbxFVFf-idomx8ukzntk9Hh7a0vU0DGt-7YhwCNzjHyaN9ZD_ZWttUSJTBBcxMkFLF9DiMouXp9jrTSXcNmiY5CsNRxkR0mLT8C58LYWRAX2PjWkk_v7hqDQOwx70V0sO16trxuU-riN6ai72q-R7Sxw0ca7OIcjbtd4cFhcr0FFI2xgZ4csd-x7b9cKGvnZzQGOaQKo1aTfc7MLzZ_VWX_muMxUUnAIzRySSxuw-DvKMAUjHdVCi4HVPjZtWHvQU2ebUzO_xdNNT9_bWMw7J";

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
    public void ExtractReporteeOrgNumbers_ShouldReturnReportees_FromAnsattportenAccessToken()
    {
        var handler = CreateHandler(null);

        var orgNumbers = handler.ExtractReporteeOrgNumbers(AccessTokenWithReportee);

        Assert.Equal(["310888168"], orgNumbers);
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
    public async Task HandleRequirementAsync_ShouldFail_WhenTokenHasNoReportees()
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
    public async Task HandleRequirementAsync_ShouldFail_WhenOrgNotFoundInAltinnOrgs()
    {
        var reportees = new[] { TestOrgNumber };
        var token = CreateJwtToken(reportees);
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
    public async Task HandleRequirementAsync_ShouldSucceed_WhenUserHasMatchingReporteeOrgNumber()
    {
        var reportees = new[] { TestOrgNumber };
        var token = CreateJwtToken(reportees);
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
    public async Task HandleRequirementAsync_ShouldFail_WhenUserHasNoMatchingReporteeOrgNumber()
    {
        var reportees = new[] { OtherOrgNumber };
        var token = CreateJwtToken(reportees);
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
    public async Task HandleRequirementAsync_ShouldSucceed_WhenUserHasMultipleReporteesWithMatch()
    {
        var reportees = new[] { OtherOrgNumber, TestOrgNumber, "123456789" };
        var token = CreateJwtToken(reportees);
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
        var reportees = new[] { TestOrgNumber };
        var token = CreateJwtToken(reportees);
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
        var token = CreateJwtTokenWithCustomReportees(new[] { new { ID = "0192:" } });
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
        var token = CreateJwtTokenWithCustomReportees(new[] { new { ID = "991825827" } });
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
        var token = CreateJwtTokenWithCustomReportees(new[] { new { ID = "" } });
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
        var authorizationDetails = new[]
        {
            new
            {
                type = "ansattporten:altinn:service",
                resource = "urn:altinn:resource:5613:1",
                reportees = orgNumbers.Length > 0
                    ? Array.ConvertAll(orgNumbers, orgNo => new { ID = $"0192:{orgNo}" })
                    : Array.Empty<object>(),
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

    private static string CreateJwtTokenWithCustomReportees(object[] reportees)
    {
        var authorizationDetails = new[]
        {
            new
            {
                type = "ansattporten:altinn:service",
                resource = "urn:altinn:resource:5613:1",
                reportees,
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

    private static OrgAccessHandler CreateHandler(
        HttpContext? httpContext,
        Action<Mock<IEnvironmentsService>>? configureEnvironmentsService = null
    )
    {
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        configureEnvironmentsService?.Invoke(environmentsServiceMock);

        var loggerMock = new Mock<ILogger<OrgAccessHandler>>();

        return new OrgAccessHandler(httpContextAccessorMock.Object, environmentsServiceMock.Object, loggerMock.Object);
    }
}
