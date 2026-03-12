using System.Text.Json;
using Altinn.App.Api.Features.Bootstrap;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
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
    private readonly AppImplementationFactory _appImplementationFactory;
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
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
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

        var layoutSettings = GetLayoutSettings(uiFolder);
        if (layoutSettings is null)
        {
            return CreateUiFolderNotFoundResult(uiFolder);
        }

        var subformValidation = ValidateSubformDataElement(instance, layoutSettings, dataElementId);
        if (subformValidation != null)
        {
            return subformValidation;
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
    /// <param name="prefill">Optional JSON object of field-value pairs for query param prefill.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Complete form bootstrap data.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(FormBootstrapResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [Route("{org}/{app}/api/bootstrap-form/{uiFolder}")]
    public async Task<ActionResult<FormBootstrapResponse>> GetStatelessFormBootstrap(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] string uiFolder,
        [FromQuery] string language = "nb",
        [FromQuery] string? prefill = null,
        CancellationToken cancellationToken = default
    )
    {
        if (GetLayoutSettings(uiFolder) is null)
        {
            return CreateUiFolderNotFoundResult(uiFolder);
        }

        if (User.Identity?.IsAuthenticated != true)
        {
            var isAnonymousAllowed = await IsAnonymousAllowedForFolder(uiFolder);
            if (!isAnonymousAllowed)
            {
                return Forbid();
            }
        }

        Dictionary<string, string>? prefillFromQueryParams = null;
        if (!string.IsNullOrEmpty(prefill))
        {
            prefillFromQueryParams = JsonSerializer.Deserialize<Dictionary<string, string>>(prefill);
            if (prefillFromQueryParams != null)
            {
                var validateQueryParamPrefill = _appImplementationFactory.Get<IValidateQueryParamPrefill>();
                if (validateQueryParamPrefill is not null)
                {
                    var issue = await validateQueryParamPrefill.PrefillFromQueryParamsIsValid(prefillFromQueryParams);
                    if (issue != null)
                    {
                        return BadRequest(
                            new ProblemDetails
                            {
                                Title = "Validation error from IValidateQueryParamPrefill",
                                Detail = issue.Description,
                                Status = StatusCodes.Status400BadRequest,
                                Extensions = { ["issue"] = issue },
                            }
                        );
                    }
                }
            }
        }

        try
        {
            var response = await _formBootstrapService.GetStatelessFormBootstrap(
                uiFolder,
                language,
                prefillFromQueryParams,
                cancellationToken
            );

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bootstrap stateless form");
            throw;
        }
    }

    private LayoutSettings? GetLayoutSettings(string uiFolder)
    {
        var uiConfig = _appResources.GetUiConfiguration();
        return uiConfig?.Folders.GetValueOrDefault(uiFolder);
    }

    private NotFoundObjectResult CreateUiFolderNotFoundResult(string uiFolder)
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

    private ActionResult? ValidateSubformDataElement(
        Instance instance,
        LayoutSettings layoutSettings,
        string? dataElementId
    )
    {
        if (dataElementId is not null)
        {
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

        if (layoutSettings.DefaultDataType is null)
        {
            return null;
        }

        var matchingDataElements = instance
            .Data.Where(d => d.DataType == layoutSettings.DefaultDataType)
            .Take(2)
            .ToList();
        if (matchingDataElements.Count > 1)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "Missing data element ID",
                    Status = StatusCodes.Status400BadRequest,
                    Detail =
                        $"'dataElementId' is a required argument when multiple data elements of type '{layoutSettings.DefaultDataType}' exist on the instance.",
                }
            );
        }

        return null;
    }

    private async Task<bool> IsAnonymousAllowedForFolder(string uiFolder)
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var uiConfig = _appResources.GetUiConfiguration();
        if (uiConfig?.Folders.TryGetValue(uiFolder, out var layoutSettings) != true || layoutSettings is null)
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
