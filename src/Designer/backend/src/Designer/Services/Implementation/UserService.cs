#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class UserService : IUserService
{
    private readonly IGiteaClient _giteaClient;

    public UserService(IGiteaClient giteaClient)
    {
        _giteaClient = giteaClient;
    }

    public async Task<UserOrgPermission> GetUserOrgPermission(AltinnOrgEditingContext altinnOrgEditingContext)
    {
        List<Team> teams = await _giteaClient.GetTeams();
        bool canCreateOrgRepo =
            IsUserSelfOrg(altinnOrgEditingContext.Developer, altinnOrgEditingContext.Org)
            || teams.Any(team => CheckPermissionToCreateOrgRepo(team, altinnOrgEditingContext.Org));
        bool isOrgOwner = teams.Any(team => IsOwnerTeamForOrg(team, altinnOrgEditingContext.Org));
        return new UserOrgPermission { CanCreateOrgRepo = canCreateOrgRepo, IsOrgOwner = isOrgOwner };
    }

    private bool IsUserSelfOrg(string developerName, string org)
    {
        return developerName == org;
    }

    private static bool CheckPermissionToCreateOrgRepo(Team team, string org)
    {
        return team?.CanCreateOrgRepo == true && team.Organization?.Username == org;
    }

    private static bool IsOwnerTeamForOrg(Team team, string org)
    {
        return string.Equals(team?.Organization?.Username, org, StringComparison.OrdinalIgnoreCase)
            && string.Equals(team?.Name, "Owners", StringComparison.OrdinalIgnoreCase);
    }
}
