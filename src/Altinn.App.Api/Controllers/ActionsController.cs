using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
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
    private readonly IAppModel _appModel;

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
        IAppModel appModel
    )
    {
        _authorization = authorization;
        _instanceClient = instanceClient;
        _userActionService = userActionService;
        _validationService = validationService;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _appModel = appModel;
    }

    /// <summary>
    /// Perform a task action on an instance
    /// </summary>
    /// <param name="org">unique identfier of the organisation responsible for the app</param>
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
                    Detail = "Action is missing in the request"
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

        int? userId = HttpContext.User.GetUserIdAsInt();
        if (userId == null)
        {
            return Unauthorized();
        }

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

        UserActionContext userActionContext =
            new(instance, userId.Value, actionRequest.ButtonId, actionRequest.Metadata, language);
        IUserAction? actionHandler = _userActionService.GetActionHandler(action);
        if (actionHandler == null)
        {
            return new NotFoundObjectResult(
                new UserActionResponse()
                {
                    Error = new ActionError()
                    {
                        Code = "ActionNotFound",
                        Message = $"Action handler with id {action} not found",
                    }
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
                    _ => 500
                },
                value: new UserActionResponse() { ClientActions = result.ClientActions, Error = result.Error }
            );
        }

        var dataAccessor = new CachedInstanceDataAccessor(instance, _dataClient, _appMetadata, _appModel);
        Dictionary<string, Dictionary<string, List<ValidationIssueWithSource>>>? validationIssues = null;

        if (result.UpdatedDataModels is { Count: > 0 })
        {
            var changes = await SaveChangedModels(instance, dataAccessor, result.UpdatedDataModels);

            validationIssues = await GetValidations(
                instance,
                dataAccessor,
                changes,
                actionRequest.IgnoredValidators,
                language
            );
        }

        return Ok(
            new UserActionResponse()
            {
                ClientActions = result.ClientActions,
                UpdatedDataModels = result.UpdatedDataModels,
                UpdatedValidationIssues = validationIssues,
                RedirectUrl = result.RedirectUrl,
            }
        );
    }

    private async Task<List<DataElementChange>> SaveChangedModels(
        Instance instance,
        CachedInstanceDataAccessor dataAccessor,
        Dictionary<string, object> resultUpdatedDataModels
    )
    {
        var changes = new List<DataElementChange>();
        var instanceIdentifier = new InstanceIdentifier(instance);
        foreach (var (elementId, newModel) in resultUpdatedDataModels)
        {
            if (newModel is null)
            {
                continue;
            }
            var dataElement = instance.Data.First(d => d.Id.Equals(elementId, StringComparison.OrdinalIgnoreCase));
            var previousData = await dataAccessor.Get(dataElement);

            ObjectUtils.InitializeAltinnRowId(newModel);
            ObjectUtils.PrepareModelForXmlStorage(newModel);

            await _dataClient.UpdateData(
                newModel,
                instanceIdentifier.InstanceGuid,
                newModel.GetType(),
                instance.Org,
                instance.AppId.Split('/')[1],
                instanceIdentifier.InstanceOwnerPartyId,
                Guid.Parse(dataElement.Id)
            );
            // update dataAccessor to use the changed data
            dataAccessor.Set(dataElement, newModel);
            // add change to list
            changes.Add(
                new DataElementChange
                {
                    DataElement = dataElement,
                    PreviousValue = previousData,
                    CurrentValue = newModel,
                }
            );
        }
        return changes;
    }

    private async Task<Dictionary<string, Dictionary<string, List<ValidationIssueWithSource>>>?> GetValidations(
        Instance instance,
        IInstanceDataAccessor dataAccessor,
        List<DataElementChange> changes,
        List<string>? ignoredValidators,
        string? language
    )
    {
        var taskId = instance.Process.CurrentTask.ElementId;
        var validationIssues = await _validationService.ValidateIncrementalFormData(
            instance,
            taskId,
            changes,
            dataAccessor,
            ignoredValidators,
            language
        );

        // For historical reasons the validation issues from actions controller is separated per data element
        // The easiest way was to keep this behaviour to improve compatibility with older frontend versions
        return PartitionValidationIssuesByDataElement(validationIssues);
    }

    private Dictionary<
        string,
        Dictionary<string, List<ValidationIssueWithSource>>
    > PartitionValidationIssuesByDataElement(Dictionary<string, List<ValidationIssueWithSource>> validationIssues)
    {
        var updatedValidationIssues = new Dictionary<string, Dictionary<string, List<ValidationIssueWithSource>>>();
        foreach (var (validationSource, issuesFromSource) in validationIssues)
        {
            foreach (var issue in issuesFromSource)
            {
                if (!updatedValidationIssues.TryGetValue(issue.DataElementId ?? "", out var elementIssues))
                {
                    elementIssues = new Dictionary<string, List<ValidationIssueWithSource>>();
                    updatedValidationIssues[issue.DataElementId ?? ""] = elementIssues;
                }
                if (!elementIssues.TryGetValue(validationSource, out var sourceIssues))
                {
                    sourceIssues = new List<ValidationIssueWithSource>();
                    elementIssues[validationSource] = sourceIssues;
                }
                sourceIssues.Add(issue);
            }
        }

        return updatedValidationIssues;
    }
}
