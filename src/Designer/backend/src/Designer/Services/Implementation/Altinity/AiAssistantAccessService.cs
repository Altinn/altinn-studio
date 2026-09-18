using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;

namespace Altinn.Studio.Designer.Services.Implementation.Altinity;

public class AiAssistantAccessService : IAiAssistantAccessService
{
    /// <summary>
    /// Service owners with access during the beta.
    /// </summary>
    private static readonly string[] s_allowedServiceOwners = ["ttd", "nfk", "ssb", "dat", "brg", "staf", "ikta"];

    private readonly IGiteaClient _giteaClient;
    private readonly IUserOrganizationService _userOrganizationService;

    public AiAssistantAccessService(IGiteaClient giteaClient, IUserOrganizationService userOrganizationService)
    {
        _giteaClient = giteaClient;
        _userOrganizationService = userOrganizationService;
    }

    public async Task<string?> ResolveServiceOwnerAsync(string org, string app)
    {
        string? serviceOwner = await FindServiceOwnerAsync(org, app);
        if (serviceOwner is null)
        {
            return null;
        }

        bool isMember = await _userOrganizationService.UserIsMemberOfOrganization(serviceOwner);
        return isMember ? serviceOwner : null;
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

    private static bool IsAllowedServiceOwner(string? org)
    {
        return s_allowedServiceOwners.Contains(org);
    }
}
