using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;

namespace Altinn.Studio.Designer.Services.Implementation.Assistant;

// This is a small service now, but it will be extended with Gitea fork checking, where it will earn its keep.
public class AiAssistantAccessService : IAiAssistantAccessService
{
    /// <summary>
    /// Service owners with access during the beta.
    /// </summary>
    private static readonly string[] s_allowedServiceOwners = ["ttd", "nfk", "ssb", "dat", "brg", "staf", "ikta"];

    private readonly IUserOrganizationService _userOrganizationService;

    public AiAssistantAccessService(IUserOrganizationService userOrganizationService)
    {
        _userOrganizationService = userOrganizationService;
    }

    public async Task<bool> HasAccessAsync(string org)
    {
        if (!s_allowedServiceOwners.Contains(org))
        {
            return false;
        }

        return await _userOrganizationService.UserIsMemberOfOrganization(org);
    }
}
