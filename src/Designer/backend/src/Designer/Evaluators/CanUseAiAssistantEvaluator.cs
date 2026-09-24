#nullable disable
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Evaluators;

public class CanUseAiAssistantEvaluator : ICanUseAiAssistantEvaluator
{
    /// <summary>
    /// Service owners with access during the beta.
    /// </summary>
    private static readonly string[] s_allowedServiceOwners = ["ttd", "nfk", "ssb", "dat", "brg", "staf", "ikta"];

    private readonly IUserOrganizationService _userOrganizationService;

    public CanUseFeatureEnum Feature => CanUseFeatureEnum.AiAssistant;

    public CanUseAiAssistantEvaluator(IUserOrganizationService userOrganizationService)
    {
        _userOrganizationService = userOrganizationService;
    }

    public async Task<bool> CanUseFeatureAsync(string org, string app)
    {
        if (!s_allowedServiceOwners.Contains(org))
        {
            return false;
        }

        return await _userOrganizationService.UserIsMemberOfOrganization(org);
    }
}
