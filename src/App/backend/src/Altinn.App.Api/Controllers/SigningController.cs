using System.Text.Json;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using static Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for handling signing operations.
/// </summary>
[AutoValidateAntiforgeryTokenIfAuthCookie]
[ApiController]
[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/signing")]
public class SigningController : ControllerBase
{
    private readonly IInstanceClient _instanceClient;
    private readonly IInstanceClientWithStorageMetadata _instanceClientWithStorageMetadata;
    private readonly IProcessReader _processReader;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly IAuthorizationService _authorizationService;
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger<SigningController> _logger;
    private readonly ISigningService _signingService;

    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;

    /// <summary>
    /// Initializes a new instance of the <see cref="SigningController"/> class.
    /// </summary>
    public SigningController(
        IServiceProvider serviceProvider,
        IInstanceClient instanceClient,
        IProcessReader processReader,
        IAuthenticationContext authenticationContext,
        IAppMetadata appMetadata,
        ILogger<SigningController> logger
    )
    {
        _instanceClient = instanceClient;
        _processReader = processReader;
        _authenticationContext = authenticationContext;
        _appMetadata = appMetadata;
        _logger = logger;
        _authorizationService = serviceProvider.GetRequiredService<IAuthorizationService>();
        _signingService = serviceProvider.GetRequiredService<ISigningService>();
        _instanceClientWithStorageMetadata = serviceProvider.GetRequiredService<IInstanceClientWithStorageMetadata>();
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
    }

    /// <summary>
    /// Get updated signing state for the current signing task.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="ct">Cancellation token, populated by the framework</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="taskId">If data should be loaded from a different task than the current one.</param>
    /// <returns>An object containing updated signee state</returns>
    [HttpGet]
    [ProducesResponseType(typeof(SigningStateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> GetSigneesState(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken ct,
        [FromQuery] string? language = null,
        [FromQuery] string? taskId = null
    )
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

        _logger.LogInformation(
            "Getting signees state for org {Org} with instance {InstanceGuid} of app {App} for party {PartyId}",
            org,
            instanceGuid,
            app,
            instanceOwnerPartyId
        );

        string? finalTaskId = taskId ?? instance.Process?.CurrentTask?.ElementId;
        if (string.IsNullOrEmpty(finalTaskId) || !VerifyIsSigningTask(finalTaskId))
        {
            return NotSigningTask();
        }

        var instanceDataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            fetchedInstance.Metadata,
            finalTaskId,
            language
        );

        AltinnSignatureConfiguration signingConfiguration =
            (_processReader.GetAltinnTaskExtension(finalTaskId)?.SignatureConfiguration)
            ?? throw new ApplicationConfigException("Signing configuration not found in AltinnTaskExtension");

        List<SigneeContext> signeeContexts = await _signingService.GetSigneeContexts(
            instanceDataAccessor,
            signingConfiguration,
            ct
        );

        var response = new SigningStateResponse
        {
            SigneeStates =
            [
                .. signeeContexts
                    .Select(signeeContext =>
                    {
                        string? name = null;
                        string? organization = null;

                        switch (signeeContext.Signee)
                        {
                            case PersonSignee personSignee:
                                name = personSignee.FullName;
                                break;

                            case PersonOnBehalfOfOrgSignee personOnBehalfOfOrgSignee:
                                name = personOnBehalfOfOrgSignee.FullName;
                                organization = personOnBehalfOfOrgSignee.OnBehalfOfOrg.OrgName;
                                break;

                            case OrganizationSignee organizationSignee:
                                name = null;
                                organization = organizationSignee.OrgName;
                                break;

                            case SystemUserSignee systemUserSignee:
                                name = "System";
                                organization = systemUserSignee.OnBehalfOfOrg.OrgName;
                                break;
                        }

                        return new SigneeState
                        {
                            Name = name,
                            Organization = organization,
                            SignedTime = signeeContext.SignDocument?.SignedTime,
                            DelegationSuccessful = signeeContext.SigneeState.IsAccessDelegated,
                            NotificationStatus = GetNotificationState(signeeContext),
                            PartyId = signeeContext.Signee.GetParty().PartyId,
                        };
                    })
                    .WhereNotNull()
                    .ToList(),
            ],
        };

        return Ok(response);
    }

    /// <summary>
    /// Get the organizations that the user can sign on behalf of, if any. Determined by the user having a key role at the organization.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="ct">Cancellation token, populated by the framework</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="taskId">If data should be loaded from a different task than the current one.</param>
    /// <returns>An object containing a list of organizations that the user can sign on behalf of</returns>
    [HttpGet("organizations")]
    [ProducesResponseType(typeof(SigningAuthorizedOrganizationsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> GetAuthorizedOrganizations(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken ct,
        [FromQuery] string? language = null,
        [FromQuery] string? taskId = null
    )
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

        string? finalTaskId = taskId ?? instance.Process?.CurrentTask?.ElementId;
        if (string.IsNullOrEmpty(finalTaskId) || !VerifyIsSigningTask(finalTaskId))
        {
            return NotSigningTask();
        }

        var instanceDataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            fetchedInstance.Metadata,
            finalTaskId,
            language
        );

        AltinnSignatureConfiguration signingConfiguration =
            (_processReader.GetAltinnTaskExtension(finalTaskId)?.SignatureConfiguration)
            ?? throw new ApplicationConfigException("Signing configuration not found in AltinnTaskExtension");

        Authenticated currentAuth = _authenticationContext.Current;

        int? userId = currentAuth switch
        {
            Authenticated.User user => user.UserId,
            _ => null,
        };

        if (userId is null)
        {
            return Unauthorized();
        }

        List<OrganizationSignee> authorizedOrganizations = await _signingService.GetAuthorizedOrganizationSignees(
            instanceDataAccessor,
            signingConfiguration,
            userId.Value,
            ct
        );

        SigningAuthorizedOrganizationsResponse response = new()
        {
            Organizations =
            [
                .. authorizedOrganizations.Select(x => new AuthorizedOrganizationDetails
                {
                    OrgName = x.OrgName,
                    OrgNumber = x.OrgNumber,
                    PartyId = x.OrgParty.PartyId,
                }),
            ],
        };

        return Ok(response);
    }

    /// <summary>
    /// Get the data elements being signed in the current signature task.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="taskId">If data should be loaded from a different task than the current one.</param>
    /// <returns>An object containing the documents to be signed</returns>
    [HttpGet("data-elements")]
    [ProducesResponseType(typeof(SigningDataElementsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetDataElements(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? language = null,
        [FromQuery] string? taskId = null
    )
    {
        Instance instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            CancellationToken.None
        );

        string? finalTaskId = taskId ?? instance.Process?.CurrentTask?.ElementId;
        if (string.IsNullOrEmpty(finalTaskId) || !VerifyIsSigningTask(finalTaskId))
        {
            return NotSigningTask();
        }

        AltinnSignatureConfiguration? signingConfiguration =
            (_processReader.GetAltinnTaskExtension(finalTaskId)?.SignatureConfiguration)
            ?? throw new ApplicationConfigException("Signing configuration not found in AltinnTaskExtension");

        List<DataElement> dataElements =
        [
            .. instance
                .Data.Where(x => signingConfiguration.DataTypesToSign.Contains(x.DataType))
                .OrderBy(x => signingConfiguration.DataTypesToSign.IndexOf(x.DataType))
                .ThenBy(x => x.Created),
        ];

        foreach (DataElement dataElement in dataElements)
        {
            SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);
        }

        SigningDataElementsResponse response = new() { DataElements = dataElements };

        return Ok(response);
    }

    /// <summary>
    /// Sign the data elements of the current signing task. The signature is recorded by the signing round
    /// asynchronously: poll the signing state to see it appear.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="request">Who the signer signs on behalf of, if not themselves. May be omitted.</param>
    /// <param name="ct">Cancellation token, populated by the framework</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <returns>202 Accepted once the signature has been handed to the signing round</returns>
    [HttpPost("sign")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Sign(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] SigningRequest? request,
        CancellationToken ct,
        [FromQuery] string? language = null
    )
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
        if (string.IsNullOrEmpty(taskId) || !VerifyIsSigningTask(taskId))
        {
            return NotSigningTask();
        }

        Authenticated currentAuth = _authenticationContext.Current;
        if (currentAuth is not Authenticated.User and not Authenticated.SystemUser)
        {
            return Unauthorized();
        }

        bool authorized = await _authorizationService.AuthorizeAction(
            new AppIdentifier(org, app),
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid),
            HttpContext.User,
            "sign",
            taskId
        );
        if (!authorized)
        {
            return Forbid();
        }

        AltinnSignatureConfiguration signingConfiguration =
            (_processReader.GetAltinnTaskExtension(taskId)?.SignatureConfiguration)
            ?? throw new ApplicationConfigException("Signing configuration not found in AltinnTaskExtension");

        var instanceDataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            fetchedInstance.Metadata,
            taskId,
            language
        );

        string? onBehalfOf = request?.OnBehalfOf;
        if (
            !string.IsNullOrEmpty(onBehalfOf)
            && !await CanSignOnBehalfOf(instanceDataAccessor, signingConfiguration, currentAuth, onBehalfOf, ct)
        )
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new ProblemDetails
                {
                    Title = "Unauthorized to sign on behalf of",
                    Detail = $"The signer is not authorized to sign on behalf of organization {onBehalfOf}.",
                    Status = StatusCodes.Status403Forbidden,
                }
            );
        }

        SigningRoundState? signingRound = await GetSigningRound(instanceDataAccessor, signingConfiguration);
        if (signingRound is null || signingRound.TaskId != taskId || signingRound.Deadline <= DateTimeOffset.UtcNow)
        {
            return Conflict(
                new ProblemDetails
                {
                    Title = "No signing round is open",
                    Detail = $"Task {taskId} has no open signing round to receive the signature.",
                    Status = StatusCodes.Status409Conflict,
                }
            );
        }

        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        List<DataType> dataTypesToSign = SignatureRequestHelper.GetDataTypesToSign(appMetadata, signingConfiguration);
        var signee = await SignatureRequestHelper.GetSignee(currentAuth, onBehalfOf);
        string idempotencyKey = SignatureRequestHelper.GetSigneeIdempotencyKey(signee);
        var message = new SignMessage
        {
            Version = SignMessage.CurrentVersion,
            Signee = new SignMessage.SigneeInfo
            {
                UserId = signee.UserId,
                SystemUserId = signee.SystemUserId,
                PersonNumber = signee.PersonNumber,
                OrganizationNumber = signee.OrganizationNumber,
            },
            Language = language,
            DataElementIds =
            [
                .. SignatureRequestHelper
                    .GetDataElementSignatures(instance.Data, dataTypesToSign)
                    .Select(signature => signature.DataElementId),
            ],
        };

        var forwarder = HttpContext.RequestServices.GetRequiredService<IServiceTaskReplyForwarder>();
        try
        {
            await forwarder.ForwardReply(
                signingRound.MailboxId,
                AltinnTaskTypes.Signing,
                JsonSerializer.Serialize(message),
                idempotencyKey,
                ct
            );
        }
        catch (ServiceTaskReplyForwardException e)
        {
            return ForwardFailed(e);
        }

        return Accepted();
    }

    private async Task<bool> CanSignOnBehalfOf(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signingConfiguration,
        Authenticated currentAuth,
        string onBehalfOf,
        CancellationToken ct
    )
    {
        if (currentAuth is not Authenticated.User user)
        {
            return false;
        }

        List<OrganizationSignee> authorizedOrganizations = await _signingService.GetAuthorizedOrganizationSignees(
            instanceDataAccessor,
            signingConfiguration,
            user.UserId,
            ct
        );
        return authorizedOrganizations.Any(organization => organization.OrgNumber == onBehalfOf);
    }

    private static async Task<SigningRoundState?> GetSigningRound(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signingConfiguration
    )
    {
        if (signingConfiguration.SigningStateDataType is not { } signingStateDataType)
        {
            return null;
        }

        DataElement? element = instanceDataAccessor.GetDataElementsForType(signingStateDataType).FirstOrDefault();
        if (element is null)
        {
            return null;
        }

        ReadOnlyMemory<byte> bytes = await instanceDataAccessor.GetBinaryData(element);
        return JsonSerializer.Deserialize<SigningRoundState>(bytes.Span);
    }

    private ObjectResult ForwardFailed(ServiceTaskReplyForwardException exception)
    {
        switch (exception.Outcome)
        {
            case ServiceTaskReplyForwardOutcome.Late:
            case ServiceTaskReplyForwardOutcome.Unroutable:
                return Conflict(
                    new ProblemDetails
                    {
                        Title = "The signing round is closed",
                        Detail = "The signing round no longer accepts signatures.",
                        Status = StatusCodes.Status409Conflict,
                    }
                );
            case ServiceTaskReplyForwardOutcome.EngineUnavailable:
            case ServiceTaskReplyForwardOutcome.SigningUnavailable:
                _logger.LogWarning(exception, "Signing is unavailable: {Outcome}", exception.Outcome);
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    new ProblemDetails
                    {
                        Title = "Signing is temporarily unavailable",
                        Detail = "The signature could not be delivered right now. Try again shortly.",
                        Status = StatusCodes.Status503ServiceUnavailable,
                    }
                );
            case ServiceTaskReplyForwardOutcome.PayloadTooLarge:
            case ServiceTaskReplyForwardOutcome.MailboxFull:
            case ServiceTaskReplyForwardOutcome.Rejected:
            default:
                _logger.LogError(exception, "The signature could not be forwarded: {Outcome}", exception.Outcome);
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new ProblemDetails
                    {
                        Title = "The signature could not be forwarded",
                        Detail = "The signing round did not accept the signature.",
                        Status = StatusCodes.Status500InternalServerError,
                    }
                );
        }
    }

    private bool VerifyIsSigningTask(string taskId)
    {
        List<ProcessTask> allTasks = _processReader.GetProcessTasks();
        ProcessTask? processTask = allTasks.FirstOrDefault(t => t.Id == taskId);

        return processTask?.ExtensionElements?.TaskExtension?.TaskType == "signing";
    }

    private BadRequestObjectResult NotSigningTask()
    {
        return BadRequest(
            new ProblemDetails
            {
                Title = "Not a signing task",
                Detail =
                    $"This endpoint is only callable while the current task is a signing task, or when taskId query param is set to a signing task's ID.",
                Status = StatusCodes.Status400BadRequest,
            }
        );
    }

    private static NotificationStatus GetNotificationState(SigneeContext signeeContext)
    {
        SigneeContextState signeeState = signeeContext.SigneeState;
        if (signeeState.HasBeenMessagedForCallToSign)
        {
            return NotificationStatus.Sent;
        }

        if (signeeState.CallToSignFailedReason is not null)
        {
            return NotificationStatus.Failed;
        }

        return NotificationStatus.NotSent;
    }
}
