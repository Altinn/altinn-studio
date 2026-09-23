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
using Altinn.Platform.Register.Enums;
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
    public async Task GetPartyList_maps_authorized_parties_from_access_management()
    {
        Uri? requestUri = null;
        using var httpClient = new HttpClient(
            new DelegatingHandlerStub(
                (request, _) =>
                {
                    requestUri = request.RequestUri;
                    return Task.FromResult(JsonResponse(AuthorizedPartiesJson));
                }
            )
        );
        AuthorizationClient client = CreateClient(new Mock<IPDP>().Object, new HttpContextAccessor(), httpClient);

        List<Party>? parties = await client.GetPartyList(1337);

        Assert.NotNull(requestUri);
        Assert.Equal("/accessmanagement/api/v1/enduser/authorizedparties", requestUri.AbsolutePath);
        Assert.Contains("includeInstances=true", requestUri.Query, StringComparison.Ordinal);

        Assert.NotNull(parties);
        Assert.Equal([501337, 500000, 500600], parties.Select(p => p.PartyId));

        Party person = parties[0];
        Assert.Equal(PartyType.Person, person.PartyTypeName);
        Assert.Equal("01039012345", person.SSN);
        Assert.Null(person.OrgNumber);
        Assert.Null(person.ChildParties);

        // The main unit only reaches its subunit through an instance delegation, so that subunit is left out.
        Party organisation = parties[1];
        Assert.Equal(PartyType.Organisation, organisation.PartyTypeName);
        Assert.Equal("897069650", organisation.OrgNumber);
        Assert.Null(organisation.SSN);
        Assert.False(organisation.OnlyHierarchyElementWithNoAccess);
        Party subunit = Assert.Single(organisation.ChildParties!);
        Assert.Equal(500001, subunit.PartyId);
        Assert.Equal("BEDR", subunit.UnitType);

        // The user has no access to this main unit themselves, but to one of its subunits.
        Party hierarchyOnly = parties[2];
        Assert.True(hierarchyOnly.OnlyHierarchyElementWithNoAccess);
        Assert.Equal(500601, Assert.Single(hierarchyOnly.ChildParties!).PartyId);
    }

    [Fact]
    public async Task GetPartyList_follows_the_next_page_link()
    {
        List<string> requestedUrls = [];
        using var httpClient = new HttpClient(
            new DelegatingHandlerStub(
                (request, _) =>
                {
                    requestedUrls.Add(request.RequestUri!.ToString());
                    return Task.FromResult(
                        requestedUrls.Count == 1
                            ? JsonResponse(
                                """
                                {
                                  "links": { "next": "http://localhost:5101/accessmanagement/api/v1/enduser/authorizedparties?page=2" },
                                  "data": [{ "partyId": 1, "type": "Person", "authorizedRoles": ["PRIV"] }]
                                }
                                """
                            )
                            : JsonResponse(
                                """
                                {
                                  "links": { "next": null },
                                  "data": [{ "partyId": 2, "type": "Organization", "authorizedRoles": ["DAGL"] }]
                                }
                                """
                            )
                    );
                }
            )
        );
        AuthorizationClient client = CreateClient(new Mock<IPDP>().Object, new HttpContextAccessor(), httpClient);

        List<Party>? parties = await client.GetPartyList(1337);

        Assert.Equal(2, requestedUrls.Count);
        Assert.EndsWith("?page=2", requestedUrls[1], StringComparison.Ordinal);
        Assert.Equal([1, 2], parties!.Select(p => p.PartyId));
    }

    [Fact]
    public async Task GetPartyList_returns_null_when_access_management_fails()
    {
        using var httpClient = new HttpClient(
            new DelegatingHandlerStub(
                (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError))
            )
        );
        AuthorizationClient client = CreateClient(new Mock<IPDP>().Object, new HttpContextAccessor(), httpClient);

        Assert.Null(await client.GetPartyList(1337));
    }

    [Theory]
    [InlineData(501337, true)]
    [InlineData(500001, true)]
    [InlineData(500002, false)] // Only reached through an instance delegation
    [InlineData(500600, false)] // Only listed as the parent of a subunit
    [InlineData(123, false)]
    public async Task ValidateSelectedParty_checks_the_authorized_parties(int partyId, bool expected)
    {
        using var httpClient = new HttpClient(
            new DelegatingHandlerStub((_, _) => Task.FromResult(JsonResponse(AuthorizedPartiesJson)))
        );
        AuthorizationClient client = CreateClient(new Mock<IPDP>().Object, new HttpContextAccessor(), httpClient);

        Assert.Equal(expected, await client.ValidateSelectedParty(1337, partyId));
    }

    private static HttpResponseMessage JsonResponse(string json) =>
        new(HttpStatusCode.OK) { Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json") };

    private const string AuthorizedPartiesJson = """
        {
          "links": { "next": null },
          "data": [
            {
              "partyUuid": "2f6ee1a7-8d7b-4e1f-9a8f-1b0c3a2d4e5f",
              "partyId": 501337,
              "name": "Sophie Salt",
              "personId": "01039012345",
              "type": "Person",
              "authorizedRoles": ["PRIV"]
            },
            {
              "partyId": 500000,
              "name": "DDG Fitness AS",
              "organizationNumber": "897069650",
              "type": "Organization",
              "unitType": "AS",
              "authorizedRoles": ["DAGL"],
              "subunits": [
                {
                  "partyId": 500001,
                  "organizationNumber": "897069651",
                  "type": "Organization",
                  "unitType": "BEDR",
                  "authorizedRoles": ["DAGL"]
                },
                {
                  "partyId": 500002,
                  "organizationNumber": "897069652",
                  "type": "Organization",
                  "unitType": "BEDR",
                  "authorizedInstances": [{ "resourceId": "app_ttd_test", "instanceId": "2f6ee1a7-8d7b-4e1f-9a8f-1b0c3a2d4e50" }]
                }
              ]
            },
            {
              "partyId": 500600,
              "organizationNumber": "910000000",
              "type": "Organization",
              "unitType": "AS",
              "onlyHierarchyElementWithNoAccess": true,
              "subunits": [
                {
                  "partyId": 500601,
                  "organizationNumber": "910000001",
                  "type": "Organization",
                  "unitType": "BEDR",
                  "authorizedResources": ["app_ttd_test"]
                }
              ]
            },
            {
              "partyId": 500700,
              "organizationNumber": "920000000",
              "type": "Organization",
              "unitType": "AS",
              "authorizedInstances": [{ "resourceId": "app_ttd_test", "instanceId": "2f6ee1a7-8d7b-4e1f-9a8f-1b0c3a2d4e51" }]
            },
            {
              "partyId": 500800,
              "type": "SomethingNew",
              "authorizedRoles": ["DAGL"]
            }
          ]
        }
        """;

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
