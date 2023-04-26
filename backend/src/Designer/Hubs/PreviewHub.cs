using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Hubs;

public class PreviewHub : Hub
{
    public async Task SendMessage(string message)
    {
        Console.WriteLine($"Connection made with connectionID: {Context.ConnectionId}");
        Console.WriteLine($"Message received from client: {message}");
        await Clients.Others.SendAsync("ReceiveMessage", message);
    }

    public override async Task OnConnectedAsync()
    {
        Console.WriteLine("Websocket connected");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        Console.WriteLine("Websocket disconnected");
        await base.OnDisconnectedAsync(exception);
    }
}
