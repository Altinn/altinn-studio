#nullable disable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Evaluators;

public class CanUseUploadDataModelEvaluator : ICanUseUploadDataModelEvaluator
{
    private readonly IUserOrganizationService _userOrganizationService;

    public CanUseFeatureEnum Feature => CanUseFeatureEnum.UploadDataModel;

    public CanUseUploadDataModelEvaluator(IUserOrganizationService userOrganizationService)
    {
        _userOrganizationService = userOrganizationService;
    }

    public async Task<bool> CanUseFeatureAsync(string org, string app)
    {
        return await _userOrganizationService.UserIsMemberOfAnyOrganization();
    }
}
