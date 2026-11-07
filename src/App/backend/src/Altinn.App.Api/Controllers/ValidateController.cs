using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Represents all actions related to validation of data and instances
/// </summary>
[Authorize]
[ApiController]
public class ValidateController : ControllerBase
{
    private readonly IInstanceClientWithStorageMetadata _instanceClientWithStorageMetadata;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly IValidationService _validationService;

    /// <summary>
    /// Initializes a new instance of the <see cref="ValidateController"/> class
    /// </summary>
    public ValidateController(
        IInstanceClient instanceClient,
        IValidationService validationService,
        IServiceProvider serviceProvider
    )
    {
        _validationService = validationService;
        _instanceClientWithStorageMetadata = serviceProvider.GetRequiredService<IInstanceClientWithStorageMetadata>();
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
    }

    /// <summary>
    /// Validate an app instance. This will validate all individual data elements, both the binary elements and the elements bound
    /// to a model, and then finally the state of the instance.
    /// </summary>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">Unique id of the party that is the owner of the instance.</param>
    /// <param name="instanceGuid">Unique id to identify the instance</param>
    /// <param name="ignoredValidators">Comma separated list of validators to ignore</param>
    /// <param name="onlyIncrementalValidators">Ignore validators that don't run on PATCH requests</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    [HttpGet]
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/validate")]
    [ProducesResponseType(typeof(List<ValidationIssueWithSource>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ValidateInstance(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? ignoredValidators = null,
        [FromQuery] bool? onlyIncrementalValidators = null,
        [FromQuery] string? language = null
    )
    {
        try
        {
            var fetchedInstance = await _instanceClientWithStorageMetadata.GetInstanceWithStorageMetadata(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                authenticationMethod: null,
                CancellationToken.None
            );
            Instance instance = fetchedInstance.Instance;

            string? taskId = instance.Process?.CurrentTask?.ElementId;
            if (taskId == null)
            {
                return Problem(
                    statusCode: StatusCodes.Status409Conflict,
                    title: "Validation error",
                    detail: "Unable to validate instance without a started process."
                );
            }

            var dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
                instance,
                fetchedInstance.Metadata,
                taskId,
                language
            );

            var ignoredSources = ignoredValidators
                ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();
            List<ValidationIssueWithSource> messages = await _validationService.ValidateInstanceAtTask(
                dataAccessor,
                taskId,
                ignoredSources,
                onlyIncrementalValidators,
                language
            );
            return Ok(messages);
        }
        catch (PlatformHttpException exception)
        {
            return Problem(
                statusCode: (int)exception.Response.StatusCode,
                title: "Something went wrong.",
                detail: exception.Message
            );
        }
    }
}
