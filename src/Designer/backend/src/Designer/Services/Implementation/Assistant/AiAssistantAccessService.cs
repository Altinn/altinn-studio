using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;

namespace Altinn.Studio.Designer.Services.Implementation.Assistant;

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
