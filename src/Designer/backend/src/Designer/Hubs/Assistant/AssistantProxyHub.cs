using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Hubs.Assistant;

/// <summary>
/// SignalR hub that pushes the assistant's events to the developer's browser tabs.
/// The browser sends its commands to <see cref="Controllers.AssistantWorkflowController"/>.
/// </summary>
[Authorize]
public class AssistantProxyHub : Hub<IAssistantClient>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<AssistantProxyHub> _logger;

    public AssistantProxyHub(IHttpContextAccessor httpContextAccessor, ILogger<AssistantProxyHub> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;

        await Groups.AddToGroupAsync(connectionId, developer);

        _logger.LogInformation(
            "Assistant hub connection established for user: {Developer}, connectionId: {ConnectionId}",
            developer,
            connectionId
        );

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, developer);

        _logger.LogInformation("Assistant hub disconnected for user: {Developer}", developer);

        await base.OnDisconnectedAsync(exception);
    }
}
