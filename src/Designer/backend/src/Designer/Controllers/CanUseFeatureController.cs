#nullable disable
using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[Route("designer/api/[controller]")]
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
public class CanUseFeatureController : ControllerBase
{
    private readonly CanUseFeatureEvaluatorRegistry _canUseFeatureEvaluatorRegistry;

    public CanUseFeatureController(CanUseFeatureEvaluatorRegistry canUseFeatureEvaluatorRegistry)
    {
        _canUseFeatureEvaluatorRegistry = canUseFeatureEvaluatorRegistry;
    }

    [HttpGet]
    public async Task<IActionResult> CanUseFeature([FromQuery] string featureName)
    {
        if (!Enum.TryParse<CanUseFeatureEnum>(featureName, true, out var parsedFeatureName))
        {
            return BadRequest(new { Error = $"Invalid feature name: '{featureName}'." });
        }

        ICanUseFeatureEvaluator evaluator = _canUseFeatureEvaluatorRegistry.GetEvaluator(parsedFeatureName);
        bool canUseFeature = await evaluator.CanUseFeatureAsync();

        return Ok(new CanUseFeatureDto { CanUseFeature = canUseFeature });
    }
}
