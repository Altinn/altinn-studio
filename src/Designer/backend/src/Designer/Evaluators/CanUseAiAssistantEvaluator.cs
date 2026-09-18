#nullable disable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;

namespace Altinn.Studio.Designer.Evaluators;


public class CanUseAiAssistantEvaluator : ICanUseFeatureEvaluator
{
    private readonly IAiAssistantAccessService _aiAssistantAccessService;

    public CanUseFeatureEnum Feature => CanUseFeatureEnum.AiAssistant;

    public CanUseAiAssistantEvaluator(IAiAssistantAccessService aiAssistantAccessService)
    {
        _aiAssistantAccessService = aiAssistantAccessService;
    }

    public async Task<bool> CanUseFeatureAsync(string org, string app)
    {
        return await _aiAssistantAccessService.HasAccessAsync(org);
    }
}
