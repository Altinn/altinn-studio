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

    public async Task<List<Team>> GetDeployTeamsAsync(string org, CancellationToken cancellationToken = default)
    {
        List<Team> orgTeams = await giteaClient.GetOrgTeamsAsync(org, cancellationToken);

        return [.. orgTeams.Where(t => t.Name.StartsWith(DeployTeamPrefix, StringComparison.OrdinalIgnoreCase))];
    }

    public async Task<List<string>> GetDeployEnvironmentsAsync(
        string username,
        string org,
        CancellationToken cancellationToken = default
    )
    {
        List<Team> deployTeams = await GetDeployTeamsAsync(org, cancellationToken);
        bool[] memberships = await Task.WhenAll(
            deployTeams.Select(t => giteaClient.IsTeamMemberAsync(t.Id, username, cancellationToken))
        );
        return [.. deployTeams.Where((_, i) => memberships[i]).Select(t => t.Name[DeployTeamPrefix.Length..])];
    }

    public List<string> GetDeployEnvironments(
        string username,
        List<Team> deployTeams,
        Dictionary<long, List<User>> membersByTeam
    ) =>
        [
            .. deployTeams
                .Where(t =>
                    membersByTeam.TryGetValue(t.Id, out List<User>? members)
                    && members.Any(u => u.Login.Equals(username, StringComparison.OrdinalIgnoreCase))
                )
                .Select(t => t.Name[DeployTeamPrefix.Length..]),
        ];

    public async Task<List<User>> GetTeamMembersAsync(long teamId, CancellationToken cancellationToken = default)
    {
        return await giteaClient.GetTeamMembersAsync(teamId, cancellationToken);
    }

    public async Task<Dictionary<long, List<User>>> GetTeamMembersAsync(
        List<Team> deployTeams,
        CancellationToken cancellationToken = default
    )
    {
        List<User>[] memberLists = await Task.WhenAll(
            deployTeams.Select(t => giteaClient.GetTeamMembersAsync(t.Id, cancellationToken))
        );
        return deployTeams.Zip(memberLists).ToDictionary(x => x.First.Id, x => x.Second);
    }

    private async Task<List<Team>> ResolveDeployTeamsAsync(
        string org,
        IEnumerable<string> environments,
        CancellationToken cancellationToken
    )
    {
        List<Team> deployTeams = await GetDeployTeamsAsync(org, cancellationToken);
        return
        [
            .. environments
                .Select(env =>
                {
                    string teamName = $"{DeployTeamPrefix}{env}";
                    return deployTeams.FirstOrDefault(t => t.Name.Equals(teamName, StringComparison.OrdinalIgnoreCase));
                })
                .OfType<Team>(),
        ];
    }
}
