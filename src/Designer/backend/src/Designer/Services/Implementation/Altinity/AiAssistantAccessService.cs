using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;

namespace Altinn.Studio.Designer.Services.Implementation.Altinity;

public class AiAssistantAccessService : IAiAssistantAccessService
{
    /// <summary>
    /// Service owners with access during the beta.
    /// </summary>
    private static readonly string[] s_allowedServiceOwners = ["ttd", "nfk", "ssb", "dat", "brg", "staf", "ikta"];

    /// <summary>
    /// Gitea team a service owner adds developers to in order to grant them the assistant.
    /// </summary>
    private const string AssistantTeamName = "AiAssistant";

    private readonly IGiteaClient _giteaClient;

    public AiAssistantAccessService(IGiteaClient giteaClient)
    {
        _giteaClient = giteaClient;
    }

    public async Task<string?> ResolveServiceOwnerAsync(string org, string app)
    {
        string? serviceOwner = await FindServiceOwnerAsync(org, app);
        if (serviceOwner is null)
        {
            return null;
        }

        bool isTeamMember = await IsMemberOfAssistantTeamAsync(serviceOwner);
        return isTeamMember ? serviceOwner : null;
    }

    private async Task<string?> FindServiceOwnerAsync(string org, string app)
    {
        if (IsAllowedServiceOwner(org))
        {
            return org;
        }

        return await FindForkedServiceOwnerAsync(org, app);
    }

    /// <summary>
    /// A fork inherits access from the organization it was forked from. Gitea
    /// returns no parent for a repository that is not a fork, and no repository
    /// at all for one the developer cannot see.
    /// </summary>
    private async Task<string?> FindForkedServiceOwnerAsync(string org, string app)
    {
        var repository = await _giteaClient.GetRepository(org, app);
        if (repository?.Parent is null)
        {
            return null;
        }

        string parentOwner = repository.Parent.Owner.Login;
        return IsAllowedServiceOwner(parentOwner) ? parentOwner : null;
    }

    private async Task<bool> IsMemberOfAssistantTeamAsync(string serviceOwner)
    {
        List<Team> teams = await _giteaClient.GetTeams();
        return teams.Any(team => IsAssistantTeamOf(team, serviceOwner));
    }

    private static bool IsAssistantTeamOf(Team team, string org)
    {
        return string.Equals(team.Organization?.Username, org, StringComparison.OrdinalIgnoreCase)
            && string.Equals(team.Name, AssistantTeamName, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAllowedServiceOwner(string? org)
    {
        return s_allowedServiceOwners.Contains(org);
    }
}
