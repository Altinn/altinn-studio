using System.Net.Http;
using System.Reflection;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Xunit;

namespace Designer.Tests.Hubs.Sync;

public class SyncHubConnectionTests : DesignerEndpointsTestsBase<SyncHubConnectionTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private HubConnection _hubConnection { get; set; }

    public SyncHubConnectionTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task Connect_Disconnect_Should_WorkAsExpected()
    {
        await When.ConnectionStarted();

        Assert.True(_hubConnection.State == HubConnectionState.Connected);

        await And.When._hubConnection.StopAsync();

        Assert.True(_hubConnection.State == HubConnectionState.Disconnected);
    }

    private async Task ConnectionStarted()
    {
        _hubConnection = new HubConnectionBuilder()
            .WithUrl("ws://localhost/hubs/sync", o =>
            {
                o.HttpMessageHandlerFactory = h => GetHandler(HttpClient);
            }).Build();

        await _hubConnection.StartAsync();
    }


    private static HttpMessageHandler GetHandler(HttpClient client)
    {
        var handlerField = client.GetType().BaseType!.GetField("_handler", BindingFlags.NonPublic | BindingFlags.Instance);
        return handlerField!.GetValue(client) as HttpMessageHandler;
    }

}
