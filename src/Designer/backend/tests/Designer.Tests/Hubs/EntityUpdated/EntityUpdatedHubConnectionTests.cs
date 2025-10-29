#nullable disable
using System.Net.Http;
using System.Reflection;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Xunit;

namespace Designer.Tests.Hubs.EntityUpdated;

public class EntityUpdatedHubConnectionTests : DesignerEndpointsTestsBase<EntityUpdatedHubConnectionTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private HubConnection HubConnection { get; set; }

    public EntityUpdatedHubConnectionTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task Connect_Disconnect_Should_WorkAsExpected()
    {
        await When.ConnectionStarted();

        Assert.True(HubConnection.State == HubConnectionState.Connected);

        await And.When.HubConnection.StopAsync();

        Assert.True(HubConnection.State == HubConnectionState.Disconnected);
    }

    private async Task ConnectionStarted()
    {
        HubConnection = new HubConnectionBuilder()
            .WithUrl("ws://localhost/hubs/entity-updated", o =>
            {
                o.HttpMessageHandlerFactory = h => GetHandler(HttpClient);
            }).Build();

        await HubConnection.StartAsync();
    }


    private static HttpMessageHandler GetHandler(HttpClient client)
    {
        var handlerField = client.GetType().BaseType!.GetField("_handler", BindingFlags.NonPublic | BindingFlags.Instance);
        return handlerField!.GetValue(client) as HttpMessageHandler;
    }

}
