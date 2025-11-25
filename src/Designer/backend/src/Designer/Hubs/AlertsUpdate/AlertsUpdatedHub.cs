using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Hubs.AlertsUpdate;

[Authorize]
public class AlertsUpdatedHub(IGitea giteaService) : Hub<IAlertsUpdateClient>
{
    public override async Task OnConnectedAsync()
    {
        string connectionId = Context.ConnectionId;
        List<Organization> organizations = await giteaService.GetUserOrganizations();
        organizations.ForEach(async org => await Groups.AddToGroupAsync(connectionId, org.Username));
        await base.OnConnectedAsync();
    }
}
