#nullable disable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Hubs.Preview;

[Authorize]
public class PreviewHub : Hub<IPreviewClient>
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PreviewHub(IHttpContextAccessor httpContextAccessor)
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

    public async Task SendMessage(string message)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        await Clients.Group(developer).ReceiveMessage(message);
    }
}
