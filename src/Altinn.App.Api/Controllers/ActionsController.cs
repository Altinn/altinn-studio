using Altinn.App.Api.Extensions;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IAuthorizationService = Altinn.App.Core.Internal.Auth.IAuthorizationService;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller that handles actions performed by users
/// </summary>
[AutoValidateAntiforgeryTokenIfAuthCookie]
[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/actions")]
public class ActionsController : ControllerBase
{
    private readonly IAuthorizationService _authorization;
    private readonly IInstanceClient _instanceClient;
    private readonly UserActionService _userActionService;
    private readonly IValidationService _validationService;
    private readonly IDataClient _dataClient;
    private readonly IAppMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerialization;
    private readonly IAuthenticationContext _authenticationContext;

    /// <summary>
    /// Create new instance of the <see cref="ActionsController"/> class
    /// </summary>
    public ActionsController(
        IAuthorizationService authorization,
        IInstanceClient instanceClient,
        UserActionService userActionService,
        IValidationService validationService,
        IDataClient dataClient,
        IAppMetadata appMetadata,
        ModelSerializationService modelSerialization,
        IAuthenticationContext authenticationContext
    )
    {
        _authorization = authorization;
        _instanceClient = instanceClient;
        _userActionService = userActionService;
        _validationService = validationService;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _modelSerialization = modelSerialization;
        _authenticationContext = authenticationContext;
    }

    /// <summary>
    /// Perform a task action on an instance
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="actionRequest">user action request</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <returns><see cref="UserActionResponse"/></returns>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(UserActionResponse), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 400)]
    [ProducesResponseType(409)]
    [ProducesResponseType(500)]
    [ProducesResponseType(401)]
    public async Task<ActionResult<UserActionResponse>> Perform(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromBody] UserActionRequest actionRequest,
        [FromQuery] string? language = null
    )
    {
        string? action = actionRequest.Action;
        if (action == null)
        {
            return new BadRequestObjectResult(
                new ProblemDetails()
                {
                    Instance = instanceGuid.ToString(),
                    Status = 400,
                    Title = "Action is missing",
                    Detail = "Action is missing in the request",
                }
            );
        }

        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        if (instance?.Process == null)
        {
            return Conflict($"Process is not started.");
        }

        if (instance.Process.Ended.HasValue)
        {
            return Conflict($"Process is ended.");
        }

        var currentAuth = _authenticationContext.Current;
        if (currentAuth is not Authenticated.User user)
            return Unauthorized();

        bool authorized = await _authorization.AuthorizeAction(
            new AppIdentifier(org, app),
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid),
            HttpContext.User,
            action,
            instance.Process?.CurrentTask?.ElementId
        );
        if (!authorized)
        {
            return Forbid();
        }

        var dataMutator = new InstanceDataUnitOfWork(
            instance,
            _dataClient,
            _instanceClient,
            await _appMetadata.GetApplicationMetadata(),
            _modelSerialization
        );
        UserActionContext userActionContext = new(
            dataMutator,
            user.UserId,
            actionRequest.ButtonId,
            actionRequest.Metadata,
            language
        );
        IUserAction? actionHandler = _userActionService.GetActionHandler(action);
        if (actionHandler == null)
        {
            return new NotFoundObjectResult(
                new UserActionResponse()
                {
                    Instance = instance,
                    Error = new ActionError()
                    {
                        Code = "ActionNotFound",
                        Message = $"Action handler with id {action} not found",
                    },
                }
            );
        }

        UserActionResult result = await actionHandler.HandleAction(userActionContext);

        if (result.ResultType == ResultType.Failure)
        {
            return StatusCode(
                statusCode: result.ErrorType switch
                {
                    ProcessErrorType.Conflict => 409,
                    ProcessErrorType.Unauthorized => 401,
                    ProcessErrorType.BadRequest => 400,
                    _ => 500,
                },
                value: new UserActionResponse()
                {
                    Instance = instance,
                    ClientActions = result.ClientActions,
                    Error = result.Error,
                }
            );
        }

        if (dataMutator.GetAbandonResponse() is not null)
        {
            throw new NotImplementedException(
                "return an error response from UserActions instead of abandoning the dataMutator"
            );
        }

#pragma warning disable CS0618 // Type or member is obsolete

        // Ensure that the data mutator has the previous binary data for the data elements
        // that were updated so that it shows up in diff for validation
        // and ensures that it gets saved to storage
        if (result.UpdatedDataModels is { Count: > 0 })
        {
            await Task.WhenAll(
                result.UpdatedDataModels.Select(row => dataMutator.GetFormData(new DataElementIdentifier(row.Key)))
            );
            foreach (var (elementId, data) in result.UpdatedDataModels)
            {
                // If the data mutator missed a that was returned with the deprecated UpdatedDataModels
                // we still need to return it to the frontend, but we assume it was already saved to storage
                dataMutator.SetFormData(new DataElementIdentifier(elementId), data);
            }
        }
#pragma warning restore CS0618 // Type or member is obsolete

        var changes = dataMutator.GetDataElementChanges(initializeAltinnRowId: true);

        await dataMutator.UpdateInstanceData(changes);

        var saveTask = dataMutator.SaveChanges(changes);

        var validationIssues = await GetIncrementalValidations(
            dataMutator,
            changes,
            actionRequest.IgnoredValidators,
            language
        );
        await saveTask;

        var updatedDataModels = changes
            .FormDataChanges.Where(c => c.Type != ChangeType.Deleted)
            .ToDictionary(c => c.DataElementIdentifier.Id, c => c.CurrentFormData);

        return Ok(
            new UserActionResponse()
            {
                Instance = instance,
                ClientActions = result.ClientActions,
                UpdatedDataModels = updatedDataModels,
                UpdatedValidationIssues = validationIssues,
                RedirectUrl = result.RedirectUrl,
            }
        );
    }

    private async Task<Dictionary<
        string,
        Dictionary<string, List<ValidationIssueWithSource>>
    >?> GetIncrementalValidations(
        InstanceDataUnitOfWork dataAccessor,
        DataElementChanges changes,
        List<string>? ignoredValidators,
        string? language
    )
    {
        var taskId =
            dataAccessor.Instance.Process?.CurrentTask?.ElementId
            ?? throw new Exception("Unable to validate instance without a started process.");
        var validationIssues = await _validationService.ValidateIncrementalFormData(
            dataAccessor,
            taskId,
            changes,
            ignoredValidators,
            language
        );

        // For historical reasons the validation issues from actions controller is separated per data element
        // The easiest way was to keep this behaviour to improve compatibility with older frontend versions
        return PartitionValidationIssuesByDataElement(validationIssues);
    }

    private static Dictionary<
        string,
        Dictionary<string, List<ValidationIssueWithSource>>
    > PartitionValidationIssuesByDataElement(List<ValidationSourcePair> validationIssues)
    {
        var updatedValidationIssues = new Dictionary<string, Dictionary<string, List<ValidationIssueWithSource>>>();
        foreach (var (validationSource, issuesFromSource) in validationIssues)
        {
            foreach (var issue in issuesFromSource)
            {
                if (!updatedValidationIssues.TryGetValue(issue.DataElementId ?? "", out var elementIssues))
                {
                    elementIssues = [];
                    updatedValidationIssues[issue.DataElementId ?? ""] = elementIssues;
                }
                if (!elementIssues.TryGetValue(validationSource, out var sourceIssues))
                {
                    sourceIssues = [];
                    elementIssues[validationSource] = sourceIssues;
                }
                sourceIssues.Add(issue);
            }
        }

        return updatedValidationIssues;
    }
}
