using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Registers;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class ProfileControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
    : ApiTestBase(factory, outputHelper),
        IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task User()
    {
        this.OverrideServicesForThisTest = (services) =>
        {
            services.AddTelemetrySink(additionalActivitySources: source => source.Name == "Microsoft.AspNetCore");
        };

        string org = "tdd";
        string app = "contributer-restriction";
        var userId = 1337;
        int instanceOwnerPartyId = 501337;

        using HttpClient client = GetRootedClient(org, app, includeTraceContext: true);
        string token = TestAuthentication.GetUserToken(userId: userId, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        using var response = await client.GetAsync($"{org}/{app}/api/v1/profile/user");

        var telemetry = this.Services.GetRequiredService<TelemetrySink>();
        await telemetry.WaitForServerActivity();
        var telemetrySnapshot = telemetry.GetSnapshot();

        await Verify(new { Telemetry = telemetrySnapshot, Response = response });
    }

    [Fact]
    public async Task PartyClient_401()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        var userId = 1337;
        int instanceOwnerPartyId = 501337;
        int selectedPartyId = 501338;

        this.OverrideServicesForThisTest = (services) =>
        {
            services.AddTelemetrySink(additionalActivitySources: source => source.Name == "Microsoft.AspNetCore");
            var partyClientMock = new Mock<IAltinnPartyClient>();
            partyClientMock
                .Setup(x => x.GetParty(It.Is<int>(n => n == selectedPartyId)))
                .ThrowsAsync(new ServiceException(HttpStatusCode.Unauthorized, "Unauthorized for party"));
            services.AddSingleton(partyClientMock.Object);
        };

        using HttpClient client = GetRootedClient(org, app, includeTraceContext: true);
        string token = TestAuthentication.GetUserToken(userId: userId, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{org}/{app}/api/v1/profile/user");
        request.Headers.Add("Cookie", $"AltinnPartyId={selectedPartyId}");
        await Assert.ThrowsAnyAsync<Exception>(async () => await client.SendAsync(request));

        var telemetry = this.Services.GetRequiredService<TelemetrySink>();
        await telemetry.WaitForServerActivity();
        var telemetrySnapshot = telemetry.GetSnapshot();

        // Scrub events for now since results don't seem to be deterministic...
        await Verify(telemetrySnapshot).ScrubMember<ActivityInfo>(a => a.Events);
    }
}
