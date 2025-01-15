using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class UserService : IUserService
{
    private readonly IGitea _giteaApi;

    public UserService(IGitea giteaApi)
    {
        _giteaApi = giteaApi;
    }

    public async Task<UserOrgPermission> GetUserOrgPermission(AltinnOrgContext altinnOrgContext)
    {
        bool canCreateOrgRepo = await HasPermissionToCreateOrgRepo(altinnOrgContext);
        return new UserOrgPermission() { CanCreateOrgRepo = canCreateOrgRepo };
    }

    private bool IsUserSelfOrg(string developerName, string org)
    {
        return developerName == org;
    }

    private async Task<bool> HasPermissionToCreateOrgRepo(AltinnOrgContext altinnOrgContext)
    {
        List<Team> teams = await _giteaApi.GetTeams();
        return IsUserSelfOrg(altinnOrgContext.DeveloperName, altinnOrgContext.Org) ||
               teams.Any(team => CheckPermissionToCreateOrgRepo(team, altinnOrgContext.Org));
    }

    private static bool CheckPermissionToCreateOrgRepo(Team team, string org)
    {
        return team.CanCreateOrgRepo && team.Organization.Username == org;
    }
}
