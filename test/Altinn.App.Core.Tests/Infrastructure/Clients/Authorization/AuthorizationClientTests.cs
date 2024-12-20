#nullable disable
using System.Security.Claims;
using System.Text.Json;
using Altinn.App.Common.Tests;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Authorization;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using Authorization.Platform.Authorization.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Authorization;

public class AuthorizationClientTests
{
    [Fact]
    public async Task AuthorizeActions_returns_dictionary_with_one_action_denied()
    {
        TelemetrySink telemetrySink = new();
        Mock<IPDP> pdpMock = new();
        Mock<HttpContextAccessor> httpContextAccessorMock = new();
        Mock<HttpClient> httpClientMock = new();
        Mock<IOptionsMonitor<AppSettings>> appSettingsMock = new();
        var pdpResponse = GetXacmlJsonRespons("one-action-denied");
        pdpMock.Setup(s => s.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>())).ReturnsAsync(pdpResponse);
        AuthorizationClient client = new(
            Options.Create(new PlatformSettings()),
            httpContextAccessorMock.Object,
            httpClientMock.Object,
            appSettingsMock.Object,
            pdpMock.Object,
            NullLogger<AuthorizationClient>.Instance,
            telemetrySink.Object
        );

        var claimsPrincipal = GetClaims("1337");

        var instance = new Instance()
        {
            Id = "1337/1dd16477-187b-463c-8adf-592c7fa78459",
            Org = "tdd",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            AppId = "tdd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo() { AltinnTaskType = "Data", ElementId = "Task_1" },
                EndEvent = "EndEvent_1",
            },
        };

        var expected = new Dictionary<string, bool>()
        {
            { "read", true },
            { "write", true },
            { "complete", true },
            { "lookup", false },
        };
        var actions = new List<string>() { "read", "write", "complete", "lookup" };
        var actual = await client.AuthorizeActions(instance, claimsPrincipal, actions);
        actual.Should().BeEquivalentTo(expected);

        await Verify(telemetrySink.GetSnapshot());
    }

    [Fact]
    public async Task AuthorizeActions_returns_empty_dictionary_if_no_response_from_pdp()
    {
        TelemetrySink telemetry = new();
        Mock<IPDP> pdpMock = new();
        Mock<HttpContextAccessor> httpContextAccessorMock = new();
        Mock<HttpClient> httpClientMock = new();
        Mock<IOptionsMonitor<AppSettings>> appSettingsMock = new();
        pdpMock
            .Setup(s => s.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(new XacmlJsonResponse());
        AuthorizationClient client = new AuthorizationClient(
            Options.Create(new PlatformSettings()),
            httpContextAccessorMock.Object,
            httpClientMock.Object,
            appSettingsMock.Object,
            pdpMock.Object,
            NullLogger<AuthorizationClient>.Instance,
            telemetry.Object
        );

        var claimsPrincipal = GetClaims("1337");

        var instance = new Instance()
        {
            Id = "1337/1dd16477-187b-463c-8adf-592c7fa78459",
            Org = "tdd",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            AppId = "tdd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo() { AltinnTaskType = "Data", ElementId = "Task_1" },
                EndEvent = "EndEvent_1",
            },
        };

        var expected = new Dictionary<string, bool>();
        var actions = new List<string>() { "read", "write", "complete", "lookup" };
        var actual = await client.AuthorizeActions(instance, claimsPrincipal, actions);
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetUserRolesAsync_returns_roles_on_success()
    {
        var userId = 1337;
        var userPartyId = 2001;
        var expectedRoles = new List<Role>()
        {
            new() { Type = "altinn", Value = "bobet" },
            new() { Type = "altinn", Value = "bobes" },
        };

        var responseJson = JsonSerializer.Serialize(expectedRoles);

        var httpMessageHandler = new Mock<HttpMessageHandler>();

        httpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(m =>
                    m.RequestUri != null
                    && m.RequestUri.ToString()
                        .Contains($"roles?coveredByUserId={userId}&offeredByPartyId={userPartyId}")
                ),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                new HttpResponseMessage
                {
                    StatusCode = System.Net.HttpStatusCode.OK,
                    Content = new StringContent(responseJson, System.Text.Encoding.UTF8, "application/json"),
                }
            );
        var httpClient = new HttpClient(httpMessageHandler.Object);

        TelemetrySink telemetrySink = new();
        var pdpMock = new Mock<IPDP>();

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["Cookie"] = "AltinnStudioRuntime=myFakeJwtToken";

        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(_ => _.HttpContext).Returns(httpContext);

        var appSettingsMock = new Mock<IOptionsMonitor<AppSettings>>();
        appSettingsMock
            .Setup(s => s.CurrentValue)
            .Returns(new AppSettings { RuntimeCookieName = "AltinnStudioRuntime" });

        var platformSettings = Options.Create(
            new PlatformSettings
            {
                ApiAuthorizationEndpoint = "http://authorization.test/",
                SubscriptionKey = "dummyKey",
            }
        );
        var logger = NullLogger<AuthorizationClient>.Instance;

        var client = new AuthorizationClient(
            platformSettings,
            httpContextAccessorMock.Object,
            httpClient,
            appSettingsMock.Object,
            pdpMock.Object,
            logger,
            telemetrySink.Object
        );

        var actualRoles = await client.GetUserRoles(userId, userPartyId);

        actualRoles.Should().BeEquivalentTo(expectedRoles);
    }

    [Fact]
    public async Task GetUserRolesAsync_throws_exception_on_error_status_code()
    {
        var userId = 1337;
        var userPartyId = 2001;

        var httpMessageHandler = new Mock<HttpMessageHandler>();

        httpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(m =>
                    m.RequestUri != null
                    && m.RequestUri.ToString()
                        .Contains($"roles?coveredByUserId={userId}&offeredByPartyId={userPartyId}")
                ),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                new HttpResponseMessage
                {
                    StatusCode = System.Net.HttpStatusCode.InternalServerError,
                    Content = new StringContent("Internal Server Error"),
                }
            );

        var httpClient = new HttpClient(httpMessageHandler.Object);

        var pdpMock = new Mock<IPDP>();
        var appSettingsMock = new Mock<IOptionsMonitor<AppSettings>>();
        appSettingsMock
            .Setup(s => s.CurrentValue)
            .Returns(new AppSettings { RuntimeCookieName = "AltinnStudioRuntime" });

        var platformSettings = Options.Create(new PlatformSettings { SubscriptionKey = "subscription-key" });
        var logger = NullLogger<AuthorizationClient>.Instance;
        TelemetrySink telemetry = new();

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["Cookie"] = "AltinnStudioRuntime=myFakeJwtToken";

        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(_ => _.HttpContext).Returns(httpContext);

        var client = new AuthorizationClient(
            platformSettings,
            httpContextAccessorMock.Object,
            httpClient,
            appSettingsMock.Object,
            pdpMock.Object,
            logger,
            telemetry.Object
        );

        await Assert.ThrowsAsync<Exception>(() => client.GetUserRoles(userId, userPartyId));
    }

    private static ClaimsPrincipal GetClaims(string partyId)
    {
        return new ClaimsPrincipal(
            new List<ClaimsIdentity>()
            {
                new(
                    new List<Claim>
                    {
                        new("urn:altinn:partyid", partyId, "#integer"),
                        new("urn:altinn:authlevel", "3", "#integer"),
                    }
                ),
            }
        );
    }

    private static XacmlJsonResponse GetXacmlJsonRespons(string filename)
    {
        var xacmlJesonRespons = File.ReadAllText(
            Path.Join("Infrastructure", "Clients", "Authorization", "TestData", $"{filename}.json")
        );
        return JsonSerializer.Deserialize<XacmlJsonResponse>(xacmlJesonRespons);
    }
}
