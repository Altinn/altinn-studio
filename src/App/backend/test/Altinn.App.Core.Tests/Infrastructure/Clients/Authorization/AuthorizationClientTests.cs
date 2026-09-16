using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Authorization;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

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
        AuthorizationClient client = CreateClient(
            pdpMock.Object,
            httpContextAccessorMock.Object,
            httpClientMock.Object,
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
                CurrentTask = new ProcessElementInfo() { AltinnTaskType = AltinnTaskTypes.Data, ElementId = "Task_1" },
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
        pdpMock
            .Setup(s => s.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(new XacmlJsonResponse());
        AuthorizationClient client = CreateClient(
            pdpMock.Object,
            httpContextAccessorMock.Object,
            httpClientMock.Object,
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
                CurrentTask = new ProcessElementInfo() { AltinnTaskType = AltinnTaskTypes.Data, ElementId = "Task_1" },
                EndEvent = "EndEvent_1",
            },
        };

        var expected = new Dictionary<string, bool>();
        var actions = new List<string>() { "read", "write", "complete", "lookup" };
        var actual = await client.AuthorizeActions(instance, claimsPrincipal, actions);
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetPartyList_propagates_cancellation_instead_of_swallowing_it()
    {
        // GetPartyList logs and returns null on any other failure; cancellation must surface to the caller.
        using var httpClient = new HttpClient(
            new DelegatingHandlerStub(
                (_, cancellationToken) =>
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
                }
            )
        );
        AuthorizationClient client = CreateClient(new Mock<IPDP>().Object, new HttpContextAccessor(), httpClient);
        var cancelled = new CancellationToken(canceled: true);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            client.GetPartyList(1337, cancellationToken: cancelled)
        );
    }

    [Fact]
    public async Task GetPartyList_still_returns_null_when_the_request_times_out()
    {
        // An HttpClient timeout surfaces as TaskCanceledException without the caller's token being cancelled;
        // that must keep hitting the log-and-return-null path rather than escaping as cancellation.
        using var httpClient = new HttpClient(
            new DelegatingHandlerStub((_, _) => throw new TaskCanceledException("The request timed out"))
        );
        AuthorizationClient client = CreateClient(new Mock<IPDP>().Object, new HttpContextAccessor(), httpClient);

        List<Party>? result = await client.GetPartyList(1337, cancellationToken: CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public Task AuthorizeAction_does_not_call_pdp_when_already_cancelled() =>
        AssertPdpNotCalledWhenCancelled(
            (client, cancellationToken) =>
                client.AuthorizeAction(
                    new AppIdentifier("tdd", "test-app"),
                    new InstanceIdentifier(1337, Guid.NewGuid()),
                    GetClaims("1337"),
                    "read",
                    "Task_1",
                    cancellationToken
                )
        );

    [Fact]
    public Task AuthorizeActions_does_not_call_pdp_when_already_cancelled() =>
        AssertPdpNotCalledWhenCancelled(
            (client, cancellationToken) =>
                client.AuthorizeActions(
                    new Instance
                    {
                        Id = "1337/1dd16477-187b-463c-8adf-592c7fa78459",
                        Org = "tdd",
                        AppId = "tdd/test-app",
                        InstanceOwner = new InstanceOwner { PartyId = "1337" },
                        Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
                    },
                    GetClaims("1337"),
                    ["read", "write"],
                    cancellationToken
                )
        );

    [Fact]
    public Task GetKeyRoleOrganizationParties_does_not_call_pdp_when_already_cancelled() =>
        AssertPdpNotCalledWhenCancelled(
            (client, cancellationToken) => client.GetKeyRoleOrganizationParties(1337, ["123456789"], cancellationToken)
        );

    /// <summary>
    /// IPDP has no cancellation token parameter, so the client is expected to honour cancellation by not
    /// starting the PDP call at all when the token is already cancelled.
    /// </summary>
    private static async Task AssertPdpNotCalledWhenCancelled(Func<AuthorizationClient, CancellationToken, Task> act)
    {
        Mock<IPDP> pdpMock = new(MockBehavior.Strict);
        using var httpClient = new HttpClient(new DelegatingHandlerStub());
        AuthorizationClient client = CreateClient(pdpMock.Object, new HttpContextAccessor(), httpClient);
        var cancelled = new CancellationToken(canceled: true);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => act(client, cancelled));

        pdpMock.Verify(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()), Times.Never);
    }

    private static AuthorizationClient CreateClient(
        IPDP pdp,
        IHttpContextAccessor httpContextAccessor,
        HttpClient httpClient,
        Telemetry? telemetry = null
    )
    {
        // Valid JWT format required by JwtToken.Parse
        const string validJwtToken =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        var authTokenResolver = new Mock<IAuthenticationTokenResolver>();
        authTokenResolver
            .Setup(s => s.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(JwtToken.Parse(validJwtToken));

        var services = new ServiceCollection();
        services.AddSingleton(httpContextAccessor);
        services.AddSingleton(authTokenResolver.Object);
        services.AddSingleton(pdp);
        services.AddSingleton<ILogger<AuthorizationClient>>(NullLogger<AuthorizationClient>.Instance);
        services.AddSingleton(Options.Create(new PlatformSettings()));
        if (telemetry != null)
            services.AddSingleton(telemetry);
        var serviceProvider = services.BuildServiceProvider();

        return new AuthorizationClient(httpClient, serviceProvider);
    }

    private static ClaimsPrincipal GetClaims(string partyId)
    {
        return new ClaimsPrincipal(
            new List<ClaimsIdentity>()
            {
                new(
                    new List<Claim>
                    {
                        new(AltinnUrns.PartyId, partyId, "#integer"),
                        new(AltinnUrns.AuthenticationLevel, "3", "#integer"),
                    }
                ),
            }
        );
    }

    private static XacmlJsonResponse GetXacmlJsonRespons(string filename)
    {
        var xacmlJesonRespons = File.ReadAllText(
            Path.Join(
                PathUtils.GetCoreTestsPath(),
                "Infrastructure",
                "Clients",
                "Authorization",
                "TestData",
                $"{filename}.json"
            )
        );
        var response = JsonSerializer.Deserialize<XacmlJsonResponse>(xacmlJesonRespons);
        Assert.NotNull(response);
        return response;
    }
}
