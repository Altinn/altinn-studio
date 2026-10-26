using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Infrastructure.StudioOidc;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Hubs.AlertsUpdate;

[Authorize]
public class AlertsUpdatedHub(IGiteaClient giteaService) : Hub<IAlertsUpdateClient>
{
    public override async Task OnConnectedAsync()
    {
        string connectionId = Context.ConnectionId;
        List<Organization> organizations = await giteaService.GetUserOrganizations();
        foreach (Organization org in organizations)
        {
            if (
                StudioAuthenticationProviders.IsMockporten(Context.User!)
                && org.Username != StudioAuthenticationProviders.TestOrganization
            )
            {
                continue;
            }
            await Groups.AddToGroupAsync(connectionId, org.Username);
        }
        await base.OnConnectedAsync();
    }
}
