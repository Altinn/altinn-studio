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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns((HttpContext?)null);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        environmentsServiceMock
            .Setup(x => x.GetAltinnOrg(TestOrgIdentifier))
            .ReturnsAsync((AltinnOrgModel?)null);

        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var altinnOrg = new AltinnOrgModel
        {
            OrgNr = TestOrgNumber,
            Name = new Dictionary<string, string> { { "nb", "Test Org" } },
            Environments = new List<string> { "test" }
        };

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        environmentsServiceMock
            .Setup(x => x.GetAltinnOrg(TestOrgIdentifier))
            .ReturnsAsync(altinnOrg);

        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var altinnOrg = new AltinnOrgModel
        {
            OrgNr = TestOrgNumber,
            Name = new Dictionary<string, string> { { "nb", "Test Org" } },
            Environments = new List<string> { "test" }
        };

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        environmentsServiceMock
            .Setup(x => x.GetAltinnOrg(TestOrgIdentifier))
            .ReturnsAsync(altinnOrg);

        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var altinnOrg = new AltinnOrgModel
        {
            OrgNr = TestOrgNumber,
            Name = new Dictionary<string, string> { { "nb", "Test Org" } },
            Environments = new List<string> { "test" }
        };

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        environmentsServiceMock
            .Setup(x => x.GetAltinnOrg(TestOrgIdentifier))
            .ReturnsAsync(altinnOrg);

        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var ttdOrg = new AltinnOrgModel
        {
            OrgNr = TestOrgNumber, // ttd should use Digdir's org number
            Name = new Dictionary<string, string> { { "nb", "Testdepartementet" } },
            Environments = new List<string> { "test", "production" }
        };

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        environmentsServiceMock
            .Setup(x => x.GetAltinnOrg("ttd"))
            .ReturnsAsync(ttdOrg);

        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
        var handler = new JwtSecurityTokenHandler();
        var tokenString = handler.WriteToken(token);

        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, tokenString);
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var authHandler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

        var requirement = new AnsattPortenOrgAccessRequirement();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestAuth"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

        await authHandler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenOrgNumberIsEmptyString()
    {
        var token = CreateJwtTokenWithCustomReportees(new[] { new { ID = "" } });
        var httpContextMock = CreateMockHttpContext(TestOrgIdentifier, token);
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContextMock);

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        var loggerMock = new Mock<ILogger<AnsattPortenOrgAccessHandler>>();
        var handler = new AnsattPortenOrgAccessHandler(
            httpContextAccessorMock.Object,
            environmentsServiceMock.Object,
            loggerMock.Object);

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
}
