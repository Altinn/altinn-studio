using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for bootstrapping forms by aggregating layouts, data models, options, and validation.
/// </summary>
[AutoValidateAntiforgeryTokenIfAuthCookie]
[ApiController]
public class FormBootstrapController : ControllerBase
{
    private readonly IFormBootstrapService _formBootstrapService;
    private readonly IInstanceClient _instanceClient;
    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger<FormBootstrapController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="FormBootstrapController"/> class.
    /// </summary>
    public FormBootstrapController(
        IFormBootstrapService formBootstrapService,
        IInstanceClient instanceClient,
        IAppResources appResources,
        IAppMetadata appMetadata,
        ILogger<FormBootstrapController> logger
    )
    {
        _formBootstrapService = formBootstrapService;
        _instanceClient = instanceClient;
        _appResources = appResources;
        _appMetadata = appMetadata;
        _logger = logger;
    }

    /// <summary>
    /// Gets all data needed to bootstrap a form for an instance.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The unique identifier of the instance.</param>
    /// <param name="layoutSetId">Optional layout set ID override (for subforms).</param>
    /// <param name="dataElementId">Optional data element ID override (for subforms).</param>
    /// <param name="pdf">Whether this is for PDF generation (skips validation).</param>
    /// <param name="language">Language code for text resources.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Complete form bootstrap data.</returns>
    [HttpGet]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ProducesResponseType(typeof(FormBootstrapResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/bootstrap-form")]
    public async Task<ActionResult<FormBootstrapResponse>> GetInstanceFormBootstrap(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? layoutSetId = null,
        [FromQuery] string? dataElementId = null,
        [FromQuery] bool pdf = false,
        [FromQuery] string language = "nb",
        CancellationToken cancellationToken = default
    )
    {
        var instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        if (instance == null)
        {
            return NotFound(
                new ProblemDetails
                {
                    Title = "Instance not found",
                    Status = StatusCodes.Status404NotFound,
                    Detail = $"Instance {instanceOwnerPartyId}/{instanceGuid} not found",
                }
            );
        }

        var subformValidation = ValidateSubformParameters(instance, layoutSetId, dataElementId);
        if (subformValidation != null)
        {
            return subformValidation;
        }

        try
        {
            var response = await _formBootstrapService.GetInstanceFormBootstrap(
                instance,
                layoutSetId,
                dataElementId,
                pdf,
                language,
                cancellationToken
            );

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to bootstrap form for instance {InstanceId}",
                $"{instanceOwnerPartyId}/{instanceGuid}"
            );
            throw;
        }
    }

    /// <summary>
    /// Gets all data needed to bootstrap a stateless form.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="layoutSetId">The layout set ID to use.</param>
    /// <param name="language">Language code for text resources.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Complete form bootstrap data.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(FormBootstrapResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [Route("{org}/{app}/api/bootstrap-form/{layoutSetId}")]
    public async Task<ActionResult<FormBootstrapResponse>> GetStatelessFormBootstrap(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] string layoutSetId,
        [FromQuery] string language = "nb",
        CancellationToken cancellationToken = default
    )
    {
        var validationResult = ValidateLayoutSetId(layoutSetId);
        if (validationResult != null)
        {
            return validationResult;
        }

        if (User.Identity?.IsAuthenticated != true)
        {
            var isAnonymousAllowed = await IsAnonymousAllowedForLayoutSet(layoutSetId);
            if (!isAnonymousAllowed)
            {
                return Forbid();
            }
        }

        try
        {
            var response = await _formBootstrapService.GetStatelessFormBootstrap(
                layoutSetId,
                language,
                cancellationToken
            );

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bootstrap stateless form for layout set {LayoutSetId}", layoutSetId);
            throw;
        }
    }

    private NotFoundObjectResult? ValidateLayoutSetId(string layoutSetId)
    {
        var layoutSets = _appResources.GetLayoutSets();
        if (layoutSets?.Sets.Any(s => s.Id == layoutSetId) != true)
        {
            return NotFound(
                new ProblemDetails
                {
                    Title = "Layout set not found",
                    Status = StatusCodes.Status404NotFound,
                    Detail = $"Layout set '{layoutSetId}' not found",
                }
            );
        }
        return null;
    }

    private ActionResult? ValidateSubformParameters(
        Altinn.Platform.Storage.Interface.Models.Instance instance,
        string? layoutSetId,
        string? dataElementId
    )
    {
        if (layoutSetId == null && dataElementId == null)
        {
            return null;
        }

        if (layoutSetId != null && dataElementId == null)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "Missing data element ID",
                    Status = StatusCodes.Status400BadRequest,
                    Detail = "When providing layoutSetId for a subform, dataElementId is also required.",
                }
            );
        }

        if (dataElementId != null && layoutSetId == null)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "Missing layout set ID",
                    Status = StatusCodes.Status400BadRequest,
                    Detail = "When providing dataElementId for a subform, layoutSetId is also required.",
                }
            );
        }

        var layoutSets = _appResources.GetLayoutSets();
        var layoutSet = layoutSets?.Sets.FirstOrDefault(s => s.Id == layoutSetId);
        if (layoutSet == null)
        {
            return NotFound(
                new ProblemDetails
                {
                    Title = "Layout set not found",
                    Status = StatusCodes.Status404NotFound,
                    Detail = $"Layout set '{layoutSetId}' not found.",
                }
            );
        }

        var dataElement = instance.Data.FirstOrDefault(d => d.Id == dataElementId);
        if (dataElement == null)
        {
            return NotFound(
                new ProblemDetails
                {
                    Title = "Data element not found",
                    Status = StatusCodes.Status404NotFound,
                    Detail = $"Data element '{dataElementId}' not found on instance.",
                }
            );
        }

        if (layoutSet.DataType != null && dataElement.DataType != layoutSet.DataType)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "Data type mismatch",
                    Status = StatusCodes.Status400BadRequest,
                    Detail =
                        $"Data element type '{dataElement.DataType}' does not match layout set data type '{layoutSet.DataType}'.",
                }
            );
        }

        return null;
    }

    private async Task<bool> IsAnonymousAllowedForLayoutSet(string layoutSetId)
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var layoutSets = _appResources.GetLayoutSets();
        var layoutSet = layoutSets?.Sets.FirstOrDefault(s => s.Id == layoutSetId);

        if (layoutSet?.DataType == null)
        {
            return false;
        }

        var dataType = appMetadata.DataTypes.FirstOrDefault(dt => dt.Id == layoutSet.DataType);
        return dataType?.AppLogic?.AllowAnonymousOnStateless ?? false;
    }
}
