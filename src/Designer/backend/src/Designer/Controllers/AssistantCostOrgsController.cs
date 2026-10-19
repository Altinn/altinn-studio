using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Evaluators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Lists the organizations the developer can charge assistant usage to when working in their own repository.
/// </summary>
[ApiController]
[Authorize]
[Route("designer/api/assistant/cost-orgs")]
public class AssistantCostOrgsController : ControllerBase
{
    private readonly ICanUseAiAssistantEvaluator _canUseAiAssistantEvaluator;

    public AssistantCostOrgsController(ICanUseAiAssistantEvaluator canUseAiAssistantEvaluator)
    {
        _canUseAiAssistantEvaluator = canUseAiAssistantEvaluator;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<AssistantCostOrg>>> GetCostOrgs()
    {
        var organizations = await _canUseAiAssistantEvaluator.GetEligibleCostOrgsAsync();
        return Ok(
            organizations.Select(organization => new AssistantCostOrg(organization.Username, organization.FullName))
        );
    }

    public sealed record AssistantCostOrg(string Username, string? FullName);
}
