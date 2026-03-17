#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class UserOrganizationService : IUserOrganizationService
{
    private readonly IGiteaClient _giteaClient;

    public UserOrganizationService(IGiteaClient giteaClient)
    {
        _giteaClient = giteaClient;
    }

    public async Task<bool> UserIsMemberOfAnyOrganization()
    {
        var organizations = await _giteaClient.GetUserOrganizations();
        if (organizations == null)
        {
            return false;
        }
        return organizations.Count > 0;
    }

    public async Task<bool> UserIsMemberOfOrganization(string org)
    {
        var organizations = await _giteaClient.GetUserOrganizations();
        if (organizations == null)
        {
            return false;
        }
        return organizations.Exists(organization => organization.Username == org);
    }

    public async Task<bool> UserIsMemberOfAnyOf(IEnumerable<string> organizations)
    {
        var userOrganizations = await _giteaClient.GetUserOrganizations();
        if (userOrganizations == null)
        {
            return false;
        }
        return userOrganizations.Any(userOrg => organizations.Contains(userOrg.Username));
    }
}
