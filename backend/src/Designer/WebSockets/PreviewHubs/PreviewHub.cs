using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.WebSockets.PreviewHubs;

public class PreviewHub : Hub
{
    public async Task SendMessage(string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", message);
    }
}
