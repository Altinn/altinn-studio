using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize(Policy = AltinnPolicy.MustHaveAdminPermission)]
[AutoValidateAntiforgeryToken]
[Route("designer/api/v1/{org}/inactivity-undeploy")]
public class InactivityUndeployController(IAppInactivityUndeployJobQueue jobQueue) : ControllerBase
{
    [HttpGet("{environment}/run")]
    public async Task<ActionResult<InactivityUndeployRunQueuedResponse>> Run(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            Guard.AssertValidateOrganization(org);
        }
        catch (ArgumentException)
        {
            return BadRequest($"Invalid org value '{org}'.");
        }

        try
        {
            Guard.AssertValidEnvironmentName(environment);
        }
        catch (ArgumentException)
        {
            return BadRequest($"Invalid environment value '{environment}'.");
        }

        if (!AppInactivityUndeployJobConstants.IsTargetEnvironment(environment))
        {
            return BadRequest($"Unsupported environment '{environment}' for inactivity undeploy.");
        }

        var queued = await jobQueue.QueuePerOrgEvaluationJobAsync(org, environment, cancellationToken);

        return Accepted(new InactivityUndeployRunQueuedResponse
        {
            Org = org,
            Environment = environment,
            Queued = queued
        });
    }
}

public class InactivityUndeployRunQueuedResponse
{
    public required string Org { get; init; }
    public required string Environment { get; init; }
    public required bool Queued { get; init; }
}
