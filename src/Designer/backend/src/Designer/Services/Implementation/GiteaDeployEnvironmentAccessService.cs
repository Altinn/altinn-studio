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
        IEnumerable<string> environments,
        CancellationToken cancellationToken = default
    )
    {
        List<Team> teams = await ResolveDeployTeamsAsync(org, environments, cancellationToken);
        foreach (Team team in teams)
        {
            await giteaClient.AddTeamMemberAsync(team.Id, username, cancellationToken);
        }
    }

    public async Task RevokeAccessAsync(
        string org,
        string username,
        IEnumerable<string> environments,
        CancellationToken cancellationToken = default
    )
    {
        List<Team> teams = await ResolveDeployTeamsAsync(org, environments, cancellationToken);
        foreach (Team team in teams)
        {
            await giteaClient.RemoveTeamMemberAsync(team.Id, username, cancellationToken);
        }
    }

    public async Task<List<string>> GetDeployEnvironmentsAsync(
        string org,
        string username,
        CancellationToken cancellationToken = default
    )
    {
        List<Team> orgTeams = await giteaClient.GetOrgTeamsAsync(org, cancellationToken);

        List<Team> deployTeams =
        [
            .. orgTeams.Where(t => t.Name.StartsWith(DeployTeamPrefix, StringComparison.OrdinalIgnoreCase)),
        ];

        bool[] memberships = await Task.WhenAll(
            deployTeams.Select(t => giteaClient.IsTeamMemberAsync(t.Id, username, cancellationToken))
        );

        return [.. deployTeams.Where((_, i) => memberships[i]).Select(t => t.Name[DeployTeamPrefix.Length..])];
    }

    private async Task<List<Team>> ResolveDeployTeamsAsync(
        string org,
        IEnumerable<string> environments,
        CancellationToken cancellationToken
    )
    {
        List<Team> orgTeams = await giteaClient.GetOrgTeamsAsync(org, cancellationToken);
        return
        [
            .. environments
                .Select(env =>
                {
                    string teamName = $"{DeployTeamPrefix}{env}";
                    return orgTeams.FirstOrDefault(t => t.Name.Equals(teamName, StringComparison.OrdinalIgnoreCase));
                })
                .OfType<Team>(),
        ];
    }
}
