using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartz;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/v1/{org}/internals")]
public class InternalsController(
    IDeploymentService deploymentService,
    IAppInactivityUndeployJobQueue jobQueue,
    ISchedulerFactory schedulerFactory,
    IUserOrganizationService userOrganizationService
) : ControllerBase
{
    private const string InternalDevelopersOrg = "ttd";

    /// <summary>
    /// Publishes the sync-root GitOps OCI image to the container registry.
    /// This triggers a pipeline that pushes the GitOps configuration for an org's environment.
    /// It's get method on purpose to allow triggering from browser.
    /// </summary>
    /// <param name="org">Organization name</param>
    /// <param name="environment">Target environment</param>
    /// <param name="cancellationToken">Cancellation token to abort the operation</param>
    /// <returns>Accepted response when pipeline is queued</returns>
    [HttpGet("sync-gitops/{environment}/push")]
    [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
    public async Task<IActionResult> PublishSyncRoot(
        string org,
        string environment,
        CancellationToken cancellationToken
    )
    {
        if (!await HasInternalDeveloperAccess())
        {
            return Forbid();
        }

        var editingContext = AltinnOrgEditingContext.FromOrgDeveloper(
            org,
            AuthenticationHelper.GetDeveloperUserName(HttpContext)
        );
        await deploymentService.PublishSyncRootAsync(
            editingContext,
            AltinnEnvironment.FromName(environment),
            cancellationToken
        );

        return Accepted();
    }

    [HttpGet("inactivity-undeploy/{environment}/run")]
    [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
    public async Task<ActionResult<InactivityUndeployRunQueuedResponse>> RunUndeploy(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        if (!await HasInternalDeveloperAccess())
        {
            return Forbid();
        }

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

        return Accepted(
            new InactivityUndeployRunQueuedResponse
            {
                Org = org,
                Environment = environment,
                Queued = queued,
            }
        );
    }

    /// <summary>
    /// Runs read-only activity collection for the deployed apps of an org now.
    /// </summary>
    [HttpGet("app-activity/collect")]
    public async Task<IActionResult> CollectAppActivity(string org, CancellationToken cancellationToken = default)
    {
        if (!await HasInternalDeveloperAccess())
        {
            return Forbid();
        }

        try
        {
            Guard.AssertValidateOrganization(org);
        }
        catch (ArgumentException)
        {
            return BadRequest($"Invalid org value '{org}'.");
        }

        await TriggerAppActivityCollection(
            new JobDataMap { [AppActivityCollectionJobConstants.JobDataOrgKey] = org },
            cancellationToken
        );
        return Accepted();
    }

    /// <summary>
    /// Runs read-only activity collection for all orgs now instead of waiting for the nightly schedule.
    /// </summary>
    [HttpGet("app-activity/collect-all")]
    public async Task<IActionResult> CollectAppActivityForAllOrgs(CancellationToken cancellationToken = default)
    {
        if (!await HasInternalDeveloperAccess())
        {
            return Forbid();
        }

        await TriggerAppActivityCollection(new JobDataMap(), cancellationToken);
        return Accepted();
    }

    private async Task TriggerAppActivityCollection(JobDataMap jobData, CancellationToken cancellationToken)
    {
        var scheduler = await schedulerFactory.GetScheduler(cancellationToken);
        await scheduler.TriggerJob(AppActivityCollectionJobConstants.JobKey, jobData, cancellationToken);
    }

    private Task<bool> HasInternalDeveloperAccess()
    {
        return userOrganizationService.UserIsMemberOfOrganization(InternalDevelopersOrg);
    }
}

public class InactivityUndeployRunQueuedResponse
{
    public required string Org { get; init; }
    public required string Environment { get; init; }
    public required bool Queued { get; init; }
}
