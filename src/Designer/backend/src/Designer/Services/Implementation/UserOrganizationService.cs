#nullable disable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class UserOrganizationService : IUserOrganizationService
{
    private readonly IGiteaClient _giteaClientClient;

    public UserOrganizationService(IGiteaClient giteaClientClient)
    {
        _giteaClientClient = giteaClientClient;
    }

    public async Task<bool> UserIsMemberOfAnyOrganization()
    {
        var organizations = await _giteaClientClient.GetUserOrganizations();
        if (organizations == null)
        {
            return false;
        }
        return organizations.Count > 0;
    }

    public async Task<bool> UserIsMemberOfOrganization(string org)
    {
        var organizations = await _giteaClientClient.GetUserOrganizations();
        if (organizations == null)
        {
            return false;
        }
        return organizations.Exists(organization => organization.Username == org);
    }
}
