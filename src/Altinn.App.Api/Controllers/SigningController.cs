using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
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
    private readonly IProcessReader _processReader;
    private readonly IAuthenticationContext _authenticationContext;
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
        _logger = logger;
        _signingService = serviceProvider.GetRequiredService<ISigningService>();
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
        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

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

        IInstanceDataAccessor instanceDataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            finalTaskId,
            language
        );

        AltinnSignatureConfiguration signingConfiguration =
            (_processReader.GetAltinnTaskExtension(finalTaskId)?.SignatureConfiguration)
            ?? throw new ApplicationConfigException("Signing configuration not found in AltinnTaskExtension");

        List<SigneeContext> signeeContexts = await _signingService.GetSigneeContexts(
            instanceDataAccessor,
            signingConfiguration,
            taskId,
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
        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

        string? finalTaskId = taskId ?? instance.Process?.CurrentTask?.ElementId;
        if (string.IsNullOrEmpty(finalTaskId) || !VerifyIsSigningTask(finalTaskId))
        {
            return NotSigningTask();
        }

        IInstanceDataAccessor instanceDataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
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
        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

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
