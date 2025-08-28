using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Services.Interfaces;
using LibGit2Sharp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Preview.V3;

/// <summary>
/// Controller for preview support of older versions of Studio
/// </summary>
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("{org:regex(^(?!designer|editor|dashboard|preview|resourceadm|info))}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/v3/instances")]
public class OldInstancesController(IHttpContextAccessor httpContextAccessor,
    IPreviewService previewService,
    IAltinnGitRepositoryFactory altinnGitRepositoryFactory
) : Controller
{
    /// <summary>
    /// Get instance data
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}")]
    [UseSystemTextJson]
    public async Task<ActionResult<Instance>> GetInstanceAsync(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int partyId,
            [FromRoute] Guid instanceGuid,
            CancellationToken cancellationToken)
    {
        string refererHeader = Request.Headers["Referer"];
        Uri refererUri = new(refererHeader);
        string layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];
        layoutSetName = string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
        Instance instance = await previewService.GetMockInstance(org, app, AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext), partyId, layoutSetName, CancellationToken.None);
        return Ok(instance);
    }

    /// <summary>
    /// Create a new instance
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Instance>> Post(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] int instanceOwnerPartyId,
        [FromQuery] string taskId,
        [FromQuery] string language = null
    )
    {
        string refererHeader = Request.Headers["Referer"];
        Uri refererUri = new(refererHeader);
        string layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];
        layoutSetName = string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
        Instance instance = await previewService.GetMockInstance(org, app, AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext), instanceOwnerPartyId, layoutSetName, CancellationToken.None);
        return Ok(instance);
    }

    /// <summary>
    /// Endpoint to get active instances for apps with state/layout sets/multiple processes
    /// </summary>
    /// <returns>A list of a single mocked instance</returns>
    [HttpGet("{partyId}/active")]
    public ActionResult<List<Instance>> ActiveInstances(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int partyId
    )
    {
        // Simulate never having any active instances
        List<Instance> activeInstances = new();
        return Ok(activeInstances);
    }

    /// <summary>
    /// Endpoint to validate an instance
    /// </summary>
    /// <returns>Ok</returns>
    [HttpGet("{partyId}/{instanceGuId}/validate")]
    public ActionResult ValidateInstance()
    {
        return Ok();
    }

    /// <summary>
    /// Action for getting a mocked response for the current task connected to the instance
    /// </summary>
    /// <returns>The processState</returns>
    [HttpGet("{partyId}/{instanceGuid}/process")]
    public async Task<ActionResult<AppProcessState>> Process(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int partyId,
            [FromRoute] Guid instanceGuid,
            CancellationToken cancellationToken)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        string refererHeader = Request.Headers["Referer"];
        Uri refererUri = new(refererHeader);
        string layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];
        layoutSetName = string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
        Instance instance = await previewService.GetMockInstance(org, app, AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext), partyId, layoutSetName, CancellationToken.None);
        List<string> tasks = await previewService.GetTasksForAllLayoutSets(org, app, developer, cancellationToken);
        AppProcessState processState = new(instance.Process)
        {
            ProcessTasks = tasks != null
                ? new List<AppProcessTaskTypeInfo>(tasks?.ConvertAll(task => new AppProcessTaskTypeInfo { ElementId = task, AltinnTaskType = "data" }))
                : null
        };

        return Ok(processState);
    }

    /// <summary>
    /// Action for getting a mocked response for the next task connected to the instance
    /// </summary>
    /// <returns>The processState object on the global mockInstance object</returns>
    [HttpGet("{partyId}/{instanceGuid}/process/next")]
    public async Task<ActionResult> ProcessNextAsync(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int partyId,
            [FromRoute] Guid instanceGuid,
            CancellationToken cancellationToken
    )
    {
        string refererHeader = Request.Headers["Referer"];
        Uri refererUri = new(refererHeader);
        string layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];
        layoutSetName = string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
        Instance instance = await previewService.GetMockInstance(org, app, AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext), partyId, layoutSetName, CancellationToken.None);
        return Ok(instance.Process);
    }

    /// <summary>
    /// Action for mocking an end to the process in order to get receipt after "send inn" is pressed
    /// </summary>
    /// <returns>Process object where ended is set</returns>
    [HttpPut("{partyId}/{instanceGuid}/process/next")]
    public async Task<ActionResult> UpdateProcessNext(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int partyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string lang,
            CancellationToken cancellationToken
    )
    {
        string refererHeader = Request.Headers.Referer;
        Uri refererUri = new(refererHeader);
        string layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];
        layoutSetName = string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
        Instance instance = await previewService.GetMockInstance(org, app, AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext), partyId, layoutSetName, CancellationToken.None);
        return Ok(instance.Process);
    }

    /// <summary>
    /// Action for getting options list for a given options list id for a given instance
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/options/{optionListId}")]
    public async Task<ActionResult<string>> GetOptionsForInstance(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string optionListId,
            [FromQuery] string language,
            [FromQuery] string source,
            CancellationToken cancellationToken
    )
    {
        try
        {
            // TODO: Need code to get dynamic options list based on language and source?
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            string options = await altinnAppGitRepository.GetOptionsList(optionListId, cancellationToken);
            return Ok(options);
        }
        catch (NotFoundException)
        {
            // Return empty list since app-frontend don't handle a null result
            return Ok(new List<string>());
        }
    }

    /// <summary>
    /// Action for getting data list for a given data list id for a given instance
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/datalists/{dataListId}")]
    public ActionResult<List<string>> GetDataListsForInstance(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string dataListId,
            [FromQuery] string language,
            [FromQuery] string size,
            CancellationToken cancellationToken
    )
    {
        // TODO: Should look into whether we can get some actual data here, or if we can make an "informed" mock based on the setup.
        // For now, we just return an empty list.
        return Ok(new List<string>());
    }

    /// <summary>
    /// Action for updating data model with tag for attachment component // TODO: Figure out what actually happens here
    /// </summary>
    [HttpPost("{partyId}/{instanceGuid}/pages/order")]
    public IActionResult UpdateAttachmentWithTag(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] string currentPage,
            [FromQuery] string layoutSetId,
            [FromQuery] string dataTypeId
    )
    {
        return Ok();
    }
}
