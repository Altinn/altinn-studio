#nullable disable
using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Hubs.Sync;

[Authorize]
public class SyncHub : Hub<ISyncClient>
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SyncHub(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override async Task OnConnectedAsync()
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;
        await Groups.AddToGroupAsync(connectionId, developer);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;
        await Groups.RemoveFromGroupAsync(connectionId, developer);
        await base.OnDisconnectedAsync(exception);
    }
}
