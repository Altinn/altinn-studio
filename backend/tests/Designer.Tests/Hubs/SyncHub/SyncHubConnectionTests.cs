using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Hubs.Auth;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Xunit;

namespace Designer.Tests.Hubs.SyncHub;

public class SyncHubConnectionTests : DisagnerEndpointsTestsBase<SyncHubConnectionTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private HubConnection HubConnection { get; set; }

    public SyncHubConnectionTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task Connect_Disconnect_Should_WorkAsExpected()
    {
        await When.ConnectionStarted();

        Then.HubConnection.State.Should().Be(HubConnectionState.Connected);

        await And.When.HubConnection.StopAsync();
        Then.HubConnection.State.Should().Be(HubConnectionState.Disconnected);
    }

    private async Task ConnectionStarted()
    {
        var client = HttpClient;

        HubConnection = new HubConnectionBuilder()
            .WithUrl("ws://localhost/sync-hub", o =>
            {
                o.HttpMessageHandlerFactory = h => new HubAuthDelegatingHandler(client)
                {
                    InnerHandler = Factory.Server.CreateHandler()
                };
            }).Build();

        await HubConnection.StartAsync();
    }

}
