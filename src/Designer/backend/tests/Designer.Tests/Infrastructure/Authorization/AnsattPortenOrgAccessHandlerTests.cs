#nullable enable
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Infrastructure.Authorization;

public class AnsattPortenOrgAccessHandlerTests
{
    private const string TestOrgIdentifier = "ttd";
    private const string TestOrgNumber = "991825827";
    private const string OtherOrgNumber = "310461598";

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenHttpContextIsNull()
    {
        var handler = CreateHandler(null);

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal();
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenOrgRouteValueIsMissing()
    {
        var httpContextMock = CreateMockHttpContext(null, null);
        var handler = CreateHandler(httpContextMock);

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenAccessTokenIsMissing()
    {
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, null);
        var handler = CreateHandler(httpContextMock);

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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
        var handler = CreateHandler(httpContextMock, envService =>
        {
            envService.Setup(x => x.GetAltinnOrgNumber(TestOrgIdentifier))
                .ReturnsAsync((string?)null);
        });

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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
        var handler = CreateHandler(httpContextMock, envService =>
        {
            envService.Setup(x => x.GetAltinnOrgNumber(TestOrgIdentifier))
                .ReturnsAsync(TestOrgNumber);
        });

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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
        var handler = CreateHandler(httpContextMock, envService =>
        {
            envService.Setup(x => x.GetAltinnOrgNumber(TestOrgIdentifier))
                .ReturnsAsync(TestOrgNumber);
        });

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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
        var handler = CreateHandler(httpContextMock, envService =>
        {
            envService.Setup(x => x.GetAltinnOrgNumber(TestOrgIdentifier))
                .ReturnsAsync(TestOrgNumber);
        });

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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
        var handler = CreateHandler(httpContextMock, envService =>
        {
            envService.Setup(x => x.GetAltinnOrgNumber("ttd"))
                .ReturnsAsync(TestOrgNumber);
        });

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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
            { "authorization_details", "{invalid json" }
        };

        var token = new JwtSecurityToken(header, payload);
        var jwtHandler = new JwtSecurityTokenHandler();
        var tokenString = jwtHandler.WriteToken(token);

        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, tokenString);
        var handler = CreateHandler(httpContextMock);

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

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

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    private static HttpContext CreateMockHttpContext(string? orgRouteValue, string? accessToken)
    {
        var httpContext = new DefaultHttpContext();

        if (orgRouteValue != null)
        {
            httpContext.Request.RouteValues = new RouteValueDictionary
            {
                { "org", orgRouteValue }
            };
        }

        var authServiceMock = new Mock<IAuthenticationService>();
        if (accessToken != null)
        {
            var tokens = new AuthenticationProperties();
            tokens.StoreTokens(new[]
            {
                new AuthenticationToken { Name = "access_token", Value = accessToken }
            });

            var authenticateResult = AuthenticateResult.Success(
                new AuthenticationTicket(
                    new ClaimsPrincipal(new ClaimsIdentity()),
                    tokens,
                    AnsattPortenConstants.AnsattportenCookiesAuthenticationScheme));

            authServiceMock
                .Setup(x => x.AuthenticateAsync(
                    It.IsAny<HttpContext>(),
                    AnsattPortenConstants.AnsattportenCookiesAuthenticationScheme))
                .ReturnsAsync(authenticateResult);
        }
        else
        {
            authServiceMock
                .Setup(x => x.AuthenticateAsync(
                    It.IsAny<HttpContext>(),
                    AnsattPortenConstants.AnsattportenCookiesAuthenticationScheme))
                .ReturnsAsync(AuthenticateResult.NoResult());
        }

        var serviceProviderMock = new Mock<IServiceProvider>();
        serviceProviderMock
            .Setup(x => x.GetService(typeof(IAuthenticationService)))
            .Returns(authServiceMock.Object);

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
                    : Array.Empty<object>()
            }
        };

        var header = new JwtHeader();
        var payload = new JwtPayload
        {
            { "iss", "test" },
            { "aud", "test" },
            { "exp", new DateTimeOffset(DateTime.UtcNow.AddHours(1)).ToUnixTimeSeconds() },
            { "authorization_details", JsonSerializer.SerializeToElement(authorizationDetails) }
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
                reportees
            }
        };

        var header = new JwtHeader();
        var payload = new JwtPayload
        {
            { "iss", "test" },
            { "aud", "test" },
            { "exp", new DateTimeOffset(DateTime.UtcNow.AddHours(1)).ToUnixTimeSeconds() },
            { "authorization_details", JsonSerializer.SerializeToElement(authorizationDetails) }
        };

        var token = new JwtSecurityToken(header, payload);
        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(token);
    }

    private static AnsattPortenOrgAccessHandler CreateHandler(
        HttpContext? httpContext,
        Action<Mock<IEnvironmentsService>>? configureEnvironmentsService = null,
        bool isProduction = true)
    {
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        configureEnvironmentsService?.Invoke(environmentsServiceMock);

        var hostEnvironmentMock = new Mock<IHostEnvironment>();
        hostEnvironmentMock.Setup(x => x.EnvironmentName)
            .Returns(isProduction ? "Production" : "Development");

        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();

        return new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            hostEnvironmentMock.Object,
            loggerMock.Object);
    }
}
