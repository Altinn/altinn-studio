using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Helpers;
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

    /// <summary>
    /// Create new instance of the <see cref="ActionsController"/> class
    /// </summary>
    /// <param name="authorization">The authorization service</param>
    /// <param name="instanceClient">The instance client</param>
    /// <param name="userActionService">The user action service</param>
    /// <param name="validationService">Service for performing validations of user data</param>
    /// <param name="dataClient">Client for accessing data in storage</param>
    /// <param name="appMetadata">Service for getting application metadata</param>
    public ActionsController(
        IAuthorizationService authorization,
        IInstanceClient instanceClient,
        UserActionService userActionService,
        IValidationService validationService,
        IDataClient dataClient,
        IAppMetadata appMetadata
    )
    {
        _authorization = authorization;
        _instanceClient = instanceClient;
        _userActionService = userActionService;
        _validationService = validationService;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
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

        if (result.UpdatedDataModels is { Count: > 0 })
        {
            await SaveChangedModels(instance, result.UpdatedDataModels);
        }

        return new OkObjectResult(
            new UserActionResponse()
            {
                ClientActions = result.ClientActions,
                UpdatedDataModels = result.UpdatedDataModels,
                UpdatedValidationIssues = await GetValidations(
                    instance,
                    result.UpdatedDataModels,
                    actionRequest.IgnoredValidators,
                    language
                ),
                RedirectUrl = result.RedirectUrl,
            }
        );
    }

    private async Task SaveChangedModels(Instance instance, Dictionary<string, object> resultUpdatedDataModels)
    {
        var instanceIdentifier = new InstanceIdentifier(instance);
        foreach (var (elementId, newModel) in resultUpdatedDataModels)
        {
            if (newModel is null)
            {
                continue;
            }

            ObjectUtils.InitializeAltinnRowId(newModel);
            ObjectUtils.PrepareModelForXmlStorage(newModel);

            var dataElement = instance.Data.First(d => d.Id.Equals(elementId, StringComparison.OrdinalIgnoreCase));
            await _dataClient.UpdateData(
                newModel,
                instanceIdentifier.InstanceGuid,
                newModel.GetType(),
                instance.Org,
                instance.AppId.Split('/')[1],
                instanceIdentifier.InstanceOwnerPartyId,
                Guid.Parse(dataElement.Id)
            );
        }
    }

    private async Task<Dictionary<string, Dictionary<string, List<ValidationIssue>>>?> GetValidations(
        Instance instance,
        Dictionary<string, object>? resultUpdatedDataModels,
        List<string>? ignoredValidators,
        string? language
    )
    {
        if (resultUpdatedDataModels is null || resultUpdatedDataModels.Count < 1)
        {
            return null;
        }

        var instanceIdentifier = new InstanceIdentifier(instance);
        var application = await _appMetadata.GetApplicationMetadata();

        var updatedValidationIssues = new Dictionary<string, Dictionary<string, List<ValidationIssue>>>();

        // TODO: Consider validating models in parallel
        foreach (var (elementId, newModel) in resultUpdatedDataModels)
        {
            if (newModel is null)
            {
                continue;
            }

            var dataElement = instance.Data.First(d => d.Id.Equals(elementId, StringComparison.OrdinalIgnoreCase));
            var dataType = application.DataTypes.First(d =>
                d.Id.Equals(dataElement.DataType, StringComparison.OrdinalIgnoreCase)
            );

            // TODO: Consider rewriting so that we get the original data the IUserAction have requested instead of fetching it again
            var oldData = await _dataClient.GetFormData(
                instanceIdentifier.InstanceGuid,
                newModel.GetType(),
                instance.Org,
                instance.AppId.Split('/')[1],
                instanceIdentifier.InstanceOwnerPartyId,
                Guid.Parse(dataElement.Id)
            );

            var validationIssues = await _validationService.ValidateFormData(
                instance,
                dataElement,
                dataType,
                newModel,
                oldData,
                ignoredValidators,
                language
            );
            if (validationIssues.Count > 0)
            {
                updatedValidationIssues.Add(elementId, validationIssues);
            }
        }

        return updatedValidationIssues;
    }
}
