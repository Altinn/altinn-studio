using System.Security.Claims;
using System.Text.Json;
using Altinn.App.Common.Tests;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Infrastructure.Clients.Authorization;
using Altinn.App.Core.Internal.Auth;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using Authorization.Platform.Authorization.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

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
    public async Task GetUserRoles_Handles_200()
    {
        await using var fixture = Fixture.Create();

        Role[] expectedRoles =
        [
            new Role { Type = "altinn", Value = "bobet" },
            new Role { Type = "altinn", Value = "bobes" },
        ];

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "application/json")
                    .WithBodyAsJson(expectedRoles)
            );

        var actualRoles = await fixture.Client.GetUserRoles(1337, 2001);

        Assert.Equivalent(expectedRoles, actualRoles);
    }

    [Fact]
    public async Task GetUserRoles_Handles_404()
    {
        await using var fixture = Fixture.Create();

        Role[] expectedRoles = [];

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(Response.Create().WithStatusCode(404));

        var actualRoles = await fixture.Client.GetUserRoles(1337, 2001);

        Assert.Equivalent(expectedRoles, actualRoles);
    }

    [Fact]
    public async Task GetUserRoles_Throws_On_500()
    {
        await using var fixture = Fixture.Create();
        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(Response.Create().WithStatusCode(500));

        await Assert.ThrowsAnyAsync<Exception>(() => fixture.Client.GetUserRoles(1337, 2001));
    }

    private sealed record Fixture(WebApplication App) : IAsyncDisposable
    {
        internal const string ApiPath = "/authorization/api/v1/roles";

        public Mock<IHttpClientFactory> HttpClientFactoryMock =>
            Mock.Get(App.Services.GetRequiredService<IHttpClientFactory>());

        public WireMockServer Server => App.Services.GetRequiredService<WireMockServer>();

        public AuthorizationClient Client =>
            App.Services.GetServices<IAuthorizationClient>().OfType<AuthorizationClient>().Single();

        private sealed class ReqHandler(Action? onRequest = null) : DelegatingHandler
        {
            protected override Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request,
                CancellationToken cancellationToken
            )
            {
                onRequest?.Invoke();
                return base.SendAsync(request, cancellationToken);
            }
        }

        public static Fixture Create(
            Action<IServiceCollection>? registerCustomAppServices = default,
            Action? onRequest = null
        )
        {
            var server = WireMockServer.Start();

            var mockHttpClientFactory = new Mock<IHttpClientFactory>();
            mockHttpClientFactory
                .Setup(f => f.CreateClient(It.IsAny<string>()))
                .Returns(() => server.CreateClient(new ReqHandler(onRequest)));

            var app = Api.Tests.TestUtils.AppBuilder.Build(
                configData: new Dictionary<string, string?>()
                {
                    // API endpoint is configured this way since we have our `PlatformSettings`
                    // while PEP has it's own `PlatformSettings` class.
                    // So if we went the `services.Configure` route we would have to do it twice,
                    // once for ours and once for PEP's.
                    { "PlatformSettings:ApiAuthorizationEndpoint", server.Url + ApiPath },
                    { "PlatformSettings:SubscriptionKey", "dummyKey" },
                    { "AppSettings:RuntimeCookieName", "AltinnStudioRuntime" },
                },
                registerCustomAppServices: services =>
                {
                    services.AddSingleton(_ => server);

                    registerCustomAppServices?.Invoke(services);
                },
                overrideAltinnAppServices: services =>
                {
                    var httpContext = new DefaultHttpContext();
                    httpContext.Request.Headers["Cookie"] = "AltinnStudioRuntime=myFakeJwtToken";

                    var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
                    httpContextAccessorMock.Setup(_ => _.HttpContext).Returns(httpContext);

                    services.AddSingleton(httpContextAccessorMock.Object);
                    services.AddSingleton(mockHttpClientFactory.Object);
                }
            );

            return new Fixture(app);
        }

        public async ValueTask DisposeAsync() => await App.DisposeAsync();
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
            Path.Join("Infrastructure", "Clients", "Authorization", "TestData", $"{filename}.json")
        );
        var response = JsonSerializer.Deserialize<XacmlJsonResponse>(xacmlJesonRespons);
        Assert.NotNull(response);
        return response;
    }
}
