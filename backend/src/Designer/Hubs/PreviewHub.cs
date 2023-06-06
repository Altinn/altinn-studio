using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Hubs;

[Authorize]
public class PreviewHub : Hub
{
    private readonly ILogger _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PreviewHub(ILogger<PreviewHub> logger, IHttpContextAccessor httpContextAccessor)
    {
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public override Task OnConnectedAsync()
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;
        Groups.AddToGroupAsync(connectionId, developer);
        return base.OnConnectedAsync();
    }

    public async Task SendMessage(string message)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        _logger.LogInformation("Message received from client: {MessageFromClient}", message);
        await Clients.Group(developer).SendAsync("ReceiveMessage", message);
    }
}
