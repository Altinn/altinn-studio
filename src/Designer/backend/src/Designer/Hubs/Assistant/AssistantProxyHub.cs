using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
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
    private readonly IAssistantWebSocketService _webSocketService;

    public AssistantProxyHub(
        IHttpContextAccessor httpContextAccessor,
        ILogger<AssistantProxyHub> logger,
        IAssistantWebSocketService webSocketService
    )
    {
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
        _webSocketService = webSocketService;
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

        try
        {
            await _webSocketService.EnsureConnectedAsync(developer);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to establish WebSocket to Assistant for developer {Developer}. Aborting connection.",
                developer
            );
            Context.Abort();
            return;
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, developer);

        // Don't close the developer WS — it persists across tab reconnects.
        // It will be cleaned up by the service when the developer has no active sessions.

        _logger.LogInformation("Assistant hub disconnected for user: {Developer}", developer);

        await base.OnDisconnectedAsync(exception);
    }
}
