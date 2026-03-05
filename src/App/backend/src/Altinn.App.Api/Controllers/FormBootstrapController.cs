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
    private readonly FormBootstrapService _formBootstrapService;
    private readonly IInstanceClient _instanceClient;
    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger<FormBootstrapController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="FormBootstrapController"/> class.
    /// </summary>
    public FormBootstrapController(
        IServiceProvider serviceProvider,
        IInstanceClient instanceClient,
        IAppResources appResources,
        IAppMetadata appMetadata,
        ILogger<FormBootstrapController> logger
    )
    {
        _formBootstrapService = serviceProvider.GetRequiredService<FormBootstrapService>();
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
    /// <param name="uiFolder">The UI folder to use (matches the task ID or subform folder name).</param>
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
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/bootstrap-form/{uiFolder}")]
    public async Task<ActionResult<FormBootstrapResponse>> GetInstanceFormBootstrap(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string uiFolder,
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

        var folderValidation = ValidateUiFolder(uiFolder);
        if (folderValidation != null)
        {
            return folderValidation;
        }

        if (dataElementId != null)
        {
            var subformValidation = ValidateSubformDataElement(instance, uiFolder, dataElementId);
            if (subformValidation != null)
            {
                return subformValidation;
            }
        }

        try
        {
            var response = await _formBootstrapService.GetInstanceFormBootstrap(
                instance,
                uiFolder,
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
    /// <param name="uiFolder">The layout set ID to use.</param>
    /// <param name="language">Language code for text resources.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Complete form bootstrap data.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(FormBootstrapResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [Route("{org}/{app}/api/bootstrap-form/{uiFolder}")]
    public async Task<ActionResult<FormBootstrapResponse>> GetStatelessFormBootstrap(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] string uiFolder,
        [FromQuery] string language = "nb",
        CancellationToken cancellationToken = default
    )
    {
        var validationResult = ValidateUiFolder(uiFolder);
        if (validationResult != null)
        {
            return validationResult;
        }

        if (User.Identity?.IsAuthenticated != true)
        {
            var isAnonymousAllowed = await IsAnonymousAllowedForLayoutSet(uiFolder);
            if (!isAnonymousAllowed)
            {
                return Forbid();
            }
        }

        try
        {
            var response = await _formBootstrapService.GetStatelessFormBootstrap(uiFolder, language, cancellationToken);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bootstrap stateless form for layout set {LayoutSetId}", uiFolder);
            throw;
        }
    }

    private NotFoundObjectResult? ValidateUiFolder(string uiFolder)
    {
        var uiConfig = _appResources.GetUiConfiguration();
        if (uiConfig?.Folders.ContainsKey(uiFolder) != true)
        {
            return NotFound(
                new ProblemDetails
                {
                    Title = "UI folder not found",
                    Status = StatusCodes.Status404NotFound,
                    Detail = $"UI folder '{uiFolder}' not found",
                }
            );
        }
        return null;
    }

    private ActionResult? ValidateSubformDataElement(
        Altinn.Platform.Storage.Interface.Models.Instance instance,
        string uiFolder,
        string dataElementId
    )
    {
        var uiConfig = _appResources.GetUiConfiguration();
        if (uiConfig is null || !uiConfig.Folders.TryGetValue(uiFolder, out var layoutSettings))
        {
            return null; // unreachable: caller already validated the folder via ValidateUiFolder
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

        if (layoutSettings.DefaultDataType != null && dataElement.DataType != layoutSettings.DefaultDataType)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "Data type mismatch",
                    Status = StatusCodes.Status400BadRequest,
                    Detail =
                        $"Data element type '{dataElement.DataType}' does not match expected data type '{layoutSettings.DefaultDataType}'.",
                }
            );
        }

        return null;
    }

    private async Task<bool> IsAnonymousAllowedForLayoutSet(string layoutSetId)
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var uiConfig = _appResources.GetUiConfiguration();
        if (uiConfig?.Folders.TryGetValue(layoutSetId, out var layoutSettings) != true)
        {
            return false;
        }

        if (layoutSettings.DefaultDataType == null)
        {
            return false;
        }

        var dataType = appMetadata.DataTypes.FirstOrDefault(dt => dt.Id == layoutSettings.DefaultDataType);
        return dataType?.AppLogic?.AllowAnonymousOnStateless ?? false;
    }
}
