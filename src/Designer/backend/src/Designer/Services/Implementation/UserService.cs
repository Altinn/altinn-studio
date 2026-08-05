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
        if (IsUserSelfOrg(altinnOrgEditingContext.Developer, altinnOrgEditingContext.Org))
        {
            return new UserOrgPermission { CanCreateOrgRepo = true, IsOrgOwner = false };
        }

        List<Team> teams = await _giteaClient.GetTeams();
        bool canCreateOrgRepo = teams.Any(team => CheckPermissionToCreateOrgRepo(team, altinnOrgEditingContext.Org));
        bool isOrgOwner = teams.Any(team => IsOwnerTeamForOrg(team, altinnOrgEditingContext.Org));
        return new UserOrgPermission { CanCreateOrgRepo = canCreateOrgRepo, IsOrgOwner = isOrgOwner };
    }

    private static bool IsUserSelfOrg(string developerName, string org)
    {
        return string.Equals(developerName, org, StringComparison.OrdinalIgnoreCase);
    }

    private static bool CheckPermissionToCreateOrgRepo(Team team, string org)
    {
        return team?.CanCreateOrgRepo == true
            && string.Equals(team.Organization?.Username, org, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsOwnerTeamForOrg(Team team, string org)
    {
        return string.Equals(team?.Organization?.Username, org, StringComparison.OrdinalIgnoreCase)
            && string.Equals(team?.Name, "Owners", StringComparison.OrdinalIgnoreCase);
    }
}
