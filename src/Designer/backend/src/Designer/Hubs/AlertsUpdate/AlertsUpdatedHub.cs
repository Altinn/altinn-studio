using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Hubs.AlertsUpdate;

[Authorize]
public class AlertsUpdatedHub : Hub<IAlertsUpdateClient>
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AlertsUpdatedHub(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override async Task OnConnectedAsync()
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;
        await Groups.AddToGroupAsync(connectionId, "ttd");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;
        await Groups.RemoveFromGroupAsync(connectionId, "ttd");
        await base.OnDisconnectedAsync(exception);
    }
}
