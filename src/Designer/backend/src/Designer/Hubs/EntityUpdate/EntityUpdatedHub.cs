using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Hubs.EntityUpdate;

[Authorize]
public class EntityUpdatedHub : Hub<IEntityUpdateClient>
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public EntityUpdatedHub(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override async Task OnConnectedAsync()
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;
        await Groups.AddToGroupAsync(connectionId, developer);
        await Groups.AddToGroupAsync(connectionId, "ttd");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;
        await Groups.RemoveFromGroupAsync(connectionId, developer);
        await Groups.RemoveFromGroupAsync(connectionId, "ttd");
        await base.OnDisconnectedAsync(exception);
    }
}
