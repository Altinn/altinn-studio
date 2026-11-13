using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class StudioPlatformAccessService : IStudioPlatformAccessService
{
    private readonly IGiteaClient _giteaClient;
    private readonly StudioPlatformAccessSettings _settings;

    public StudioPlatformAccessService(IGiteaClient giteaClient, StudioPlatformAccessSettings settings)
    {
        _giteaClient = giteaClient;
        _settings = settings;
    }

    public async Task<bool> HasPlatformAccessAsync()
    {
        var teams = await _giteaClient.GetTeams();
        return teams is not null
            && teams.Any(team =>
                team.Organization.Username.Equals(_settings.Org, StringComparison.OrdinalIgnoreCase)
                && team.Name.Equals(_settings.Team, StringComparison.OrdinalIgnoreCase)
            );
    }
}
