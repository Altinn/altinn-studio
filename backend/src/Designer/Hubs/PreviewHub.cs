using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Hubs;

[Authorize]
public class PreviewHub : Hub
{
    private readonly ILogger _logger;

    public PreviewHub(ILogger<PreviewHub> logger)
    {
        _logger = logger;
    }

    public async Task SendMessage(string message)
    {
        _logger.LogInformation("Message received from client: {MessageFromClient}", message);
        await Clients.Others.SendAsync("ReceiveMessage", message);
    }
}
