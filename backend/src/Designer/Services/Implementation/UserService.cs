using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Services.Implementation;

public class UserService : IUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IGitea _giteaApi;

    public UserService(IHttpContextAccessor httpContextAccessor, IGitea giteaApi)
    {
        _httpContextAccessor = httpContextAccessor;
        _giteaApi = giteaApi;
    }

    public async Task<UserOrgPermission> GetUserOrgPermission(string org)
    {
        bool canCreateOrgRepo = await HasPermissionToCreateOrgRepo(org);
        return new UserOrgPermission() { CanCreateOrgRepo = canCreateOrgRepo };
    }

    private bool IsUserSelfOrg(string org)
    {
        return AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) == org;
    }

    private async Task<bool> HasPermissionToCreateOrgRepo(string org)
    {
        List<Team> teams = await _giteaApi.GetTeams();
        return IsUserSelfOrg(org) || teams.Any(team => CheckPermissionToCreateOrgRepo(team, org));
    }

    private static bool CheckPermissionToCreateOrgRepo(Team team, string org)
    {
        return team.can_create_org_repo && team.Organization.Username == org;
    }
}
