using System.Security.Claims;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Infrastructure.Clients.Authorization;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
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
                CurrentTask = new ProcessElementInfo() { AltinnTaskType = AltinnTaskTypes.Data, ElementId = "Task_1" },
                EndEvent = "EndEvent_1",
            },
        };

        var expected = new Dictionary<string, bool>();
        var actions = new List<string>() { "read", "write", "complete", "lookup" };
        var actual = await client.AuthorizeActions(instance, claimsPrincipal, actions);
        actual.Should().BeEquivalentTo(expected);
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
