using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Hubs.AlertsUpdate;

[Authorize]
public class AlertsUpdatedHub : Hub<IAlertsUpdateClient>
{
    public override async Task OnConnectedAsync()
    {
        string connectionId = Context.ConnectionId;
        await Groups.AddToGroupAsync(connectionId, "ttd");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string connectionId = Context.ConnectionId;
        await Groups.RemoveFromGroupAsync(connectionId, "ttd");
        await base.OnDisconnectedAsync(exception);
    }
}
