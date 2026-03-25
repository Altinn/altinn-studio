using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class GiteaDeployEnvironmentAccessService(IGiteaClient giteaClient) : IDeployEnvironmentAccessService
{
    private const string DeployTeamPrefix = "Deploy-";

    public async Task GrantAccessAsync(
        string org,
        string username,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        Team team = await ResolveDeployTeamAsync(org, environment, cancellationToken);
        await giteaClient.AddTeamMemberAsync(team.Id, username, cancellationToken);
    }

    public async Task RevokeAccessAsync(
        string org,
        string username,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        Team team = await ResolveDeployTeamAsync(org, environment, cancellationToken);
        await giteaClient.RemoveTeamMemberAsync(team.Id, username, cancellationToken);
    }

    private async Task<Team> ResolveDeployTeamAsync(string org, string environment, CancellationToken cancellationToken)
    {
        List<Team> orgTeams = await giteaClient.GetOrgTeamsAsync(org, cancellationToken);
        string teamName = $"{DeployTeamPrefix}{environment}";

        return orgTeams.FirstOrDefault(t => t.Name.Equals(teamName, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Deploy team '{teamName}' not found in org '{org}'.");
    }
}
