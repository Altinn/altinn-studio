using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.AccessManagement.Core.Models;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;
using Substatus = Altinn.Platform.Storage.Interface.Models.Substatus;

namespace Altinn.Platform.Storage.Controllers;

/// <summary>
/// Handles operations for the application instance resource
/// </summary>
[Route("storage/api/v1/instances")]
[ApiController]
public class InstancesController : ControllerBase
{
    private readonly IInstanceRepository _instanceRepository;
    private readonly IPartiesWithInstancesClient _partiesWithInstancesClient;
    private readonly ILogger _logger;
    private readonly IAuthorization _authorizationService;
    private readonly IInstanceEventService _instanceEventService;
    private readonly string _storageBaseAndHost;
    private readonly GeneralSettings _generalSettings;
    private readonly IRegisterService _registerService;
    private readonly IApplicationService _applicationService;

    /// <summary>
    /// Initializes a new instance of the <see cref="InstancesController"/> class
    /// </summary>
    /// <param name="instanceRepository">the instance repository handler</param>
    /// <param name="partiesWithInstancesClient">An implementation of <see cref="IPartiesWithInstancesClient"/> that can be used to send information to SBL.</param>
    /// <param name="logger">the logger</param>
    /// <param name="authorizationService">the authorization service.</param>
    /// <param name="instanceEventService">the instance event service.</param>
    /// <param name="registerService">the instance register service.</param>
    /// <param name="applicationService">the application service.</param>
    /// <param name="settings">the general settings.</param>
    public InstancesController(
        IInstanceRepository instanceRepository,
        IPartiesWithInstancesClient partiesWithInstancesClient,
        ILogger<InstancesController> logger,
        IAuthorization authorizationService,
        IInstanceEventService instanceEventService,
        IRegisterService registerService,
        IApplicationService applicationService,
        IOptions<GeneralSettings> settings
    )
    {
        _instanceRepository = instanceRepository;
        _partiesWithInstancesClient = partiesWithInstancesClient;
        _logger = logger;
        _storageBaseAndHost = $"{settings.Value.Hostname}/storage/api/v1/";
        _authorizationService = authorizationService;
        _instanceEventService = instanceEventService;
        _registerService = registerService;
        _applicationService = applicationService;
        _generalSettings = settings.Value;
    }

    /// <summary>
    /// Retrieves all instances that match the specified query parameters. Parameters can be combined. Invalid or unknown parameter values will result in a 400 Bad Request response.
    /// </summary>
    /// <param name="queryParameters">The query parameters to retrieve instance data.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>A <seealso cref="List{T}"/> contains all instances for given instance owner.</returns>
    /// <!-- GET /instances?org=tdd or GET /instances?appId=tdd/app2 -->
    [Authorize]
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Produces("application/json")]
    public async Task<ActionResult<QueryResponse<Instance>>> GetInstances(
        InstanceQueryParameters queryParameters,
        CancellationToken cancellationToken
    )
    {
        if (queryParameters.IsInvalidInstanceOwnerCombination())
        {
            return BadRequest(
                "Both InstanceOwner.PartyId and InstanceOwnerIdentifier cannot be present at the same time."
            );
        }

        string orgClaim = User.GetOrg();
        int? userId = User.GetUserId();
        SystemUserClaim systemUser = User.GetSystemUser();
        bool hasSyncAdapterScope = _authorizationService.UserHasRequiredScope(
            _generalSettings.InstanceSyncAdapterScope
        );

        if (orgClaim != null)
        {
            if (
                !hasSyncAdapterScope
                && !_authorizationService.UserHasRequiredScope(_generalSettings.InstanceReadScope)
            )
            {
                return Forbid();
            }

            if (
                string.IsNullOrEmpty(queryParameters.Org)
                && string.IsNullOrEmpty(queryParameters.AppId)
            )
            {
                return BadRequest("Org or AppId must be defined.");
            }

            if (string.IsNullOrEmpty(queryParameters.Org))
            {
                queryParameters.Org = queryParameters.AppId.Split('/')[0];
            }

            if (
                !hasSyncAdapterScope
                && !orgClaim.Equals(
                    queryParameters.Org,
                    StringComparison.InvariantCultureIgnoreCase
                )
            )
            {
                if (string.IsNullOrEmpty(queryParameters.AppId))
                {
                    return BadRequest("AppId must be defined.");
                }

                var appId = ValidateAppId(queryParameters.AppId).Split("/")[1];

                XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(
                    queryParameters.Org,
                    appId,
                    HttpContext.User,
                    "read"
                );
                XacmlJsonResponse response = await _authorizationService.GetDecisionForRequest(
                    request
                );

                if (!DecisionHelper.ValidatePdpDecision(response?.Response, HttpContext.User))
                {
                    return Forbid();
                }
            }
        }
        else if (userId is not null || systemUser is not null)
        {
            if (
                queryParameters.InstanceOwnerPartyId == null
                && string.IsNullOrEmpty(queryParameters.InstanceOwnerIdentifier)
            )
            {
                return BadRequest(
                    "Either InstanceOwnerPartyId or InstanceOwnerIdentifier need to be defined."
                );
            }
        }
        else
        {
            return BadRequest();
        }

        if (!string.IsNullOrEmpty(queryParameters.InstanceOwnerIdentifier))
        {
            (string instanceOwnerIdType, string instanceOwnerIdValue) =
                InstanceHelper.GetIdentifierFromInstanceOwnerIdentifier(
                    queryParameters.InstanceOwnerIdentifier
                );

            if (
                string.IsNullOrEmpty(instanceOwnerIdType)
                || string.IsNullOrEmpty(instanceOwnerIdValue)
            )
            {
                return BadRequest("Invalid InstanceOwnerIdentifier.");
            }

            string orgNo = null;
            string person = null;

            if (Enum.TryParse(instanceOwnerIdType, true, out PartyType partyType))
            {
                switch (partyType)
                {
                    case PartyType.Person:
                        if (
                            !InstanceOwnerIdRegExHelper
                                .ElevenDigitRegex()
                                .IsMatch(instanceOwnerIdValue)
                        )
                        {
                            return BadRequest("Person number needs to be exactly 11 digits.");
                        }

                        person = instanceOwnerIdValue;
                        break;

                    case PartyType.Organisation:
                        if (
                            !InstanceOwnerIdRegExHelper
                                .NineDigitRegex()
                                .IsMatch(instanceOwnerIdValue)
                        )
                        {
                            return BadRequest("Organization number needs to be exactly 9 digits.");
                        }

                        orgNo = instanceOwnerIdValue;
                        break;
                }
            }

            queryParameters.InstanceOwnerPartyId = await _registerService.PartyLookup(
                person,
                orgNo
            );

            if (queryParameters.InstanceOwnerPartyId < 0)
            {
                return Ok(new QueryResponse<Instance> { Instances = [] });
            }
        }

        string selfContinuationToken = null;
        if (!string.IsNullOrEmpty(queryParameters.ContinuationToken))
        {
            selfContinuationToken = queryParameters.ContinuationToken;
            queryParameters.ContinuationToken = HttpUtility.UrlDecode(
                queryParameters.ContinuationToken
            );
        }

        bool appOwnerOrSyncAdapterRequestingInstances =
            hasSyncAdapterScope || User.HasServiceOwnerScope();

        // filter out hard deleted instances if it isn't the appOwner or the sync adapter requesting instances
        if (!appOwnerOrSyncAdapterRequestingInstances)
        {
            if (queryParameters.IsHardDeleted.HasValue && queryParameters.IsHardDeleted.Value)
            {
                return new QueryResponse<Instance>()
                {
                    Instances = [],
                    Self = BuildRequestLink(selfContinuationToken),
                };
            }

            queryParameters.IsHardDeleted = false;
        }

        if (string.IsNullOrEmpty(queryParameters.SortBy))
        {
            queryParameters.SortBy = "desc:lastChanged";
        }

        // Default is to exclude migrated altinn 1 and 2 instances
        if (
            queryParameters.MainVersionExclude == null
            && queryParameters.MainVersionInclude == null
        )
        {
            queryParameters.MainVersionInclude = 3;
        }

        queryParameters.Size ??= 100;

        try
        {
            InstanceQueryResponse result = await _instanceRepository.GetInstancesFromQuery(
                queryParameters,
                true,
                cancellationToken
            );

            if (!string.IsNullOrEmpty(result.Exception))
            {
                _logger.LogError(
                    "Unable to perform query on instances: {Exception}",
                    result.Exception
                );
                return StatusCode(
                    cancellationToken.IsCancellationRequested ? 499 : 500,
                    result.Exception
                );
            }

            if (!appOwnerOrSyncAdapterRequestingInstances)
            {
                foreach (Instance instance in result.Instances)
                {
                    FilterOutDeletedDataElements(instance);
                }

                if (cancellationToken.IsCancellationRequested)
                {
                    throw new TimeoutException("Request was cancelled.");
                }

                result.Instances = await _authorizationService.AuthorizeInstances(result.Instances);
                result.Count = result.Instances.Count;
            }

            string nextContinuationToken = HttpUtility.UrlEncode(result.ContinuationToken);

            QueryResponse<Instance> response = new()
            {
                Instances = result.Instances,
                Count = result.Instances.Count,
                Self = BuildRequestLink(selfContinuationToken),
            };

            if (!string.IsNullOrEmpty(nextContinuationToken))
            {
                response.Next = BuildRequestLink(nextContinuationToken);
            }

            // add self links to platform
            response.Instances.ForEach(i => i.SetPlatformSelfLinks(_storageBaseAndHost));

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Unable to perform query on instances");
            return StatusCode(
                cancellationToken.IsCancellationRequested ? 499 : 500,
                $"Unable to perform query on instances due to: {e.Message}"
            );
        }
    }

    /// <summary>
    /// Gets a specific instance with the given instance id.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to retrieve.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The information about the specific instance.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/json")]
    public async Task<ActionResult<Instance>> Get(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        try
        {
            (Instance result, _) = await _instanceRepository.GetOne(
                instanceGuid,
                true,
                cancellationToken
            );

            if (
                User.GetOrg() != result.Org
                && !_authorizationService.UserHasRequiredScope([
                    _generalSettings.InstanceSyncAdapterScope,
                ])
            )
            {
                FilterOutDeletedDataElements(result);
            }

            result.SetPlatformSelfLinks(_storageBaseAndHost);

            return Ok(result);
        }
        catch (Exception e)
        {
            return NotFound($"Unable to find instance {instanceOwnerPartyId}/{instanceGuid}: {e}");
        }
    }

    /// <summary>
    /// Inserts new instance into the instance collection.
    /// </summary>
    /// <param name="appId">the application id</param>
    /// <param name="instance">The instance details to store.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The stored instance.</returns>
    /// <!-- POST /instances?appId={appId} -->
    [Authorize]
    [HttpPost]
    [Consumes("application/json")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/json")]
    public async Task<ActionResult<Instance>> Post(
        string appId,
        [FromBody] Instance instance,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(instance.InstanceOwner.PartyId))
        {
            return BadRequest("Cannot create an instance without an instanceOwner.PartyId.");
        }

        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

        appId = ValidateAppId(appId);

        (Application appInfo, ServiceError appInfoError) =
            await _applicationService.GetApplicationOrErrorAsync(appId);

        if (appInfoError != null)
        {
            return appInfoError.ErrorCode switch
            {
                404 => NotFound(appInfoError.ErrorMessage),
                _ => StatusCode(appInfoError.ErrorCode, appInfoError.ErrorMessage),
            };
        }

        // Checking that user is authorized to instantiate.
        XacmlJsonRequestRoot request;
        try
        {
            request = DecisionHelper.CreateDecisionRequest(
                appInfo.Org,
                appInfo.Id.Split('/')[1],
                HttpContext.User,
                "instantiate",
                instanceOwnerPartyId,
                null
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Something went wrong during CreateDecisionRequest for application id: {appId} AppInfo: {appInfo}",
                appId,
                appInfo.ToString()
            );
            throw;
        }

        XacmlJsonResponse response;
        try
        {
            response = await _authorizationService.GetDecisionForRequest(request);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Something went wrong during GetDecisionForRequest for application id: {appId} AppInfo: {appInfo}",
                appId,
                appInfo.ToString()
            );
            throw;
        }

        if (response?.Response == null)
        {
            _logger.LogInformation(
                "// Instances Controller // Authorization of instantiation failed with request: {request}.",
                JsonConvert.SerializeObject(request)
            );
            return Forbid();
        }

        bool authorized;
        try
        {
            authorized = DecisionHelper.ValidatePdpDecision(response.Response, HttpContext.User);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Something went wrong during ValidatePdpDecision for application id: {appId} AppInfo: {appInfo}",
                appId,
                appInfo.ToString()
            );
            throw;
        }

        if (!authorized)
        {
            return Forbid();
        }

        Instance storedInstance = null;
        try
        {
            DateTime creationTime = DateTime.UtcNow;

            Instance instanceToCreate = CreateInstanceFromTemplate(
                appInfo,
                instance,
                creationTime,
                User.GetUserOrOrgNo()
            );

            storedInstance = await _instanceRepository.Create(instanceToCreate, cancellationToken);
            await _instanceEventService.DispatchEvent(InstanceEventType.Created, storedInstance);
            _logger.LogInformation(
                "Created instance: {storedInstance.Id}",
                storedInstance.Id.RemoveNewlines()
            );
            storedInstance.SetPlatformSelfLinks(_storageBaseAndHost);

            await _partiesWithInstancesClient.SetHasAltinn3Instances(instanceOwnerPartyId);
            return Created(storedInstance.SelfLinks.Platform, storedInstance);
        }
        catch (Exception storageException)
        {
            _logger.LogError(
                storageException,
                "Unable to create {appId} instance for {instance.InstanceOwner.PartyId}",
                appId.RemoveNewlines(),
                instance.InstanceOwner.PartyId?.RemoveNewlines()
            );

            // compensating action - delete instance
            if (storedInstance != null)
            {
                await _instanceRepository.Delete(storedInstance, cancellationToken);
            }

            _logger.LogError(
                "Deleted instance {storedInstance.Id}",
                storedInstance?.Id.RemoveNewlines()
            );
            return StatusCode(
                500,
                $"Unable to create {appId} instance for {instance.InstanceOwner?.PartyId} due to {storageException.Message}"
            );
        }
    }

    /// <summary>
    /// Delete an instance.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance that should be deleted.</param>
    /// <param name="hard">if true hard delete will take place. if false, the instance gets its status.softDelete attribute set to current date and time.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>Information from the deleted instance.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_DELETE)]
    [HttpDelete("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/json")]
    public async Task<ActionResult<Instance>> Delete(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        [FromQuery] bool hard,
        CancellationToken cancellationToken
    )
    {
        Instance instance;

        (instance, _) = await _instanceRepository.GetOne(instanceGuid, false, cancellationToken);

        if (instance == null)
        {
            return NotFound(
                $"Didn't find the object that should be deleted with instanceId={instanceOwnerPartyId}/{instanceGuid}"
            );
        }

        instance.Status ??= new InstanceStatus();

        (Application appInfo, ServiceError appInfoError) =
            await _applicationService.GetApplicationOrErrorAsync(instance.AppId);

        if (appInfoError != null)
        {
            return appInfoError.ErrorCode switch
            {
                404 => NotFound(appInfoError.ErrorMessage),
                _ => StatusCode(appInfoError.ErrorCode, appInfoError.ErrorMessage),
            };
        }

        if (InstanceHelper.IsPreventedFromDeletion(instance.Status, appInfo))
        {
            return StatusCode(
                403,
                "Instance cannot be deleted yet due to application restrictions."
            );
        }

        DateTime now = DateTime.UtcNow;

        List<string> updateProperties = [];
        updateProperties.Add(nameof(instance.Status));
        updateProperties.Add(nameof(instance.Status.IsSoftDeleted));
        updateProperties.Add(nameof(instance.Status.SoftDeleted));
        if (hard)
        {
            instance.Status.IsHardDeleted = true;
            instance.Status.IsSoftDeleted = true;
            instance.Status.HardDeleted = now;
            instance.Status.SoftDeleted ??= now;
            updateProperties.Add(nameof(instance.Status.IsHardDeleted));
            updateProperties.Add(nameof(instance.Status.HardDeleted));
        }
        else
        {
            instance.Status.IsSoftDeleted = true;
            instance.Status.SoftDeleted = now;
        }

        instance.LastChangedBy = User.GetUserOrOrgNo();
        instance.LastChanged = now;
        updateProperties.Add(nameof(instance.LastChanged));
        updateProperties.Add(nameof(instance.LastChangedBy));

        try
        {
            Instance deletedInstance = await _instanceRepository.Update(
                instance,
                updateProperties,
                cancellationToken
            );

            await _instanceEventService.DispatchEvent(InstanceEventType.Deleted, deletedInstance);

            return Ok(deletedInstance);
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Unexpected exception when deleting instance {instance.Id}",
                instance.Id
            );
            return StatusCode(
                500,
                $"Unexpected exception when deleting instance {instance.Id}: {e.Message}"
            );
        }
    }

    /// <summary>
    /// Add complete confirmation.
    /// </summary>
    /// <remarks>
    /// Add to an instance that a given stakeholder considers the instance as no longer needed by them. The stakeholder has
    /// collected all the data and information they needed from the instance and expect no additional data to be added to it.
    /// The body of the request isn't used for anything despite this being a POST operation.
    /// </remarks>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>Returns a list of the process events.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_COMPLETE)]
    [HttpPost("{instanceOwnerPartyId:int}/{instanceGuid:guid}/complete")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [Produces("application/json")]
    public async Task<ActionResult<Instance>> AddCompleteConfirmation(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        List<string> updateProperties = [];
        (Instance instance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        string org = User.GetOrg();

        instance.CompleteConfirmations ??= new List<CompleteConfirmation>();
        if (instance.CompleteConfirmations.Exists(cc => cc.StakeholderId == org))
        {
            instance.SetPlatformSelfLinks(_storageBaseAndHost);
            return Ok(instance);
        }

        instance.CompleteConfirmations.Add(
            new CompleteConfirmation { StakeholderId = org, ConfirmedOn = DateTime.UtcNow }
        );
        instance.LastChanged = DateTime.UtcNow;
        instance.LastChangedBy = User.GetUserOrOrgNo();

        updateProperties.Add(nameof(instance.CompleteConfirmations));
        updateProperties.Add(nameof(instance.LastChanged));
        updateProperties.Add(nameof(instance.LastChangedBy));

        Instance updatedInstance;
        try
        {
            updatedInstance = await _instanceRepository.Update(
                instance,
                updateProperties,
                cancellationToken
            );
            updatedInstance.SetPlatformSelfLinks(_storageBaseAndHost);
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Unable to update instance {instanceOwnerPartyId}/{instanceGuid}",
                instanceOwnerPartyId,
                instanceGuid
            );
            return StatusCode(StatusCodes.Status500InternalServerError);
        }

        await _instanceEventService.DispatchEvent(
            InstanceEventType.ConfirmedComplete,
            updatedInstance
        );

        return Ok(updatedInstance);
    }

    /// <summary>
    /// Update instance read status.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
    /// <param name="status">The updated read status.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>Returns the updated instance.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [HttpPut("{instanceOwnerPartyId:int}/{instanceGuid:guid}/readstatus")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Produces("application/json")]
    public async Task<ActionResult<Instance>> UpdateReadStatus(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string status,
        CancellationToken cancellationToken
    )
    {
        if (!Enum.TryParse(status, true, out ReadStatus newStatus))
        {
            return BadRequest(
                $"Invalid read status: {status}. Accepted types include: {string.Join(", ", Enum.GetNames<ReadStatus>())}"
            );
        }

        (Instance instance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        List<string> updateProperties =
        [
            nameof(instance.Status),
            nameof(instance.Status.ReadStatus),
        ];
        Instance updatedInstance;
        try
        {
            ReadStatus? oldStatus = null;
            if (instance.Status == null)
            {
                instance.Status = new InstanceStatus();
            }
            else
            {
                oldStatus = instance.Status.ReadStatus;
            }

            instance.Status.ReadStatus = newStatus;

            updatedInstance =
                (oldStatus == null || oldStatus != newStatus)
                    ? await _instanceRepository.Update(
                        instance,
                        updateProperties,
                        cancellationToken
                    )
                    : instance;
            updatedInstance.SetPlatformSelfLinks(_storageBaseAndHost);
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Unable to update read status for instance {instanceOwnerPartyId}/{instanceGuid}",
                instanceOwnerPartyId,
                instanceGuid
            );
            return StatusCode(StatusCodes.Status500InternalServerError);
        }

        return Ok(updatedInstance);
    }

    /// <summary>
    /// Update instance sub status.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
    /// <param name="substatus">The updated sub status.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>Returns the updated instance.</returns>
    [Authorize]
    [HttpPut("{instanceOwnerPartyId:int}/{instanceGuid:guid}/substatus")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Produces("application/json")]
    public async Task<ActionResult<Instance>> UpdateSubstatus(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromBody] Substatus substatus,
        CancellationToken cancellationToken
    )
    {
        DateTime creationTime = DateTime.UtcNow;

        if (substatus == null || string.IsNullOrEmpty(substatus.Label))
        {
            return BadRequest(
                $"Invalid sub status: {JsonConvert.SerializeObject(substatus)}. Substatus must be defined and include a label."
            );
        }

        (Instance instance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        string org = User.GetOrg();
        if (!instance.Org.Equals(org))
        {
            return Forbid();
        }

        Instance updatedInstance;
        try
        {
            List<string> updateProperties =
            [
                nameof(instance.Status.Substatus),
                nameof(instance.LastChanged),
                nameof(instance.LastChangedBy),
            ];
            if (instance.Status == null)
            {
                instance.Status = new InstanceStatus();
            }

            instance.Status.Substatus = substatus;
            instance.LastChanged = creationTime;
            instance.LastChangedBy = User.GetOrgNumber();

            updatedInstance = await _instanceRepository.Update(
                instance,
                updateProperties,
                cancellationToken
            );
            updatedInstance.SetPlatformSelfLinks(_storageBaseAndHost);
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Unable to update sub status for instance {instaneOwnerPartyId}/{instanceGuid}",
                instanceOwnerPartyId,
                instanceGuid
            );
            return StatusCode(StatusCodes.Status500InternalServerError);
        }

        await _instanceEventService.DispatchEvent(
            InstanceEventType.SubstatusUpdated,
            updatedInstance
        );
        return Ok(updatedInstance);
    }

    /// <summary>
    /// Updates the presentation texts on an instance
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
    /// <param name="presentationTexts">Collection of changes to the presentation texts collection.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The instance that was updated with an updated collection of presentation texts.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPut("{instanceOwnerPartyId:int}/{instanceGuid:guid}/presentationtexts")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [Consumes("application/json")]
    [Produces("application/json")]
    public async Task<ActionResult<Instance>> UpdatePresentationTexts(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromBody] PresentationTexts presentationTexts,
        CancellationToken cancellationToken
    )
    {
        if (presentationTexts?.Texts == null)
        {
            return BadRequest($"Missing parameter value: presentationTexts is misformed or empty");
        }

        (Instance instance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        if (instance.PresentationTexts == null)
        {
            instance.PresentationTexts = new Dictionary<string, string>();
        }

        List<string> updateProperties = [];
        updateProperties.Add(nameof(instance.PresentationTexts));
        foreach (KeyValuePair<string, string> entry in presentationTexts.Texts)
        {
            if (string.IsNullOrEmpty(entry.Value))
            {
                instance.PresentationTexts.Remove(entry.Key);
            }
            else
            {
                instance.PresentationTexts[entry.Key] = entry.Value;
            }
        }

        Instance updatedInstance = await _instanceRepository.Update(
            instance,
            updateProperties,
            cancellationToken
        );
        return updatedInstance;
    }

    /// <summary>
    /// Updates the data values on an instance.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
    /// <param name="dataValues">Collection of changes to the data values collection.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The instance that was updated with an updated collection of data values.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPut("{instanceOwnerPartyId:int}/{instanceGuid:guid}/datavalues")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Consumes("application/json")]
    [Produces("application/json")]
    public async Task<ActionResult<Instance>> UpdateDataValues(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromBody] DataValues dataValues,
        CancellationToken cancellationToken
    )
    {
        if (dataValues?.Values == null)
        {
            return BadRequest($"Missing parameter value: dataValues is misformed or empty");
        }

        (Instance instance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        instance.DataValues ??= new Dictionary<string, string>();

        List<string> updateProperties = [];
        updateProperties.Add(nameof(instance.DataValues));
        foreach (KeyValuePair<string, string> entry in dataValues.Values)
        {
            if (string.IsNullOrEmpty(entry.Value))
            {
                instance.DataValues.Remove(entry.Key);
            }
            else
            {
                instance.DataValues[entry.Key] = entry.Value;
            }
        }

        var updatedInstance = await _instanceRepository.Update(
            instance,
            updateProperties,
            cancellationToken
        );
        return Ok(updatedInstance);
    }

    private static Instance CreateInstanceFromTemplate(
        Application appInfo,
        Instance instanceTemplate,
        DateTime creationTime,
        string performedBy
    )
    {
        Instance createdInstance = new Instance
        {
            InstanceOwner = instanceTemplate.InstanceOwner,
            CreatedBy = performedBy,
            Created = creationTime,
            LastChangedBy = performedBy,
            LastChanged = creationTime,
            AppId = appInfo.Id,
            Org = appInfo.Org,
            VisibleAfter =
                DateTimeHelper.ConvertToUniversalTime(instanceTemplate.VisibleAfter)
                ?? creationTime,
            Status = instanceTemplate.Status ?? new InstanceStatus(),
            DueBefore = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.DueBefore),
            Data = new List<DataElement>(),
            Process = instanceTemplate.Process,
            DataValues = instanceTemplate.DataValues,
        };

        return createdInstance;
    }

    private static void FilterOutDeletedDataElements(Instance instance)
    {
        if (instance?.Data != null)
        {
            instance.Data = instance
                .Data.Where(e => e.DeleteStatus?.IsHardDeleted != true)
                .ToList();
        }
    }

    private string BuildRequestLink(string continuationToken)
    {
        string url = Request.Path;
        string queryString = Request.QueryString.Value;
        string host = $"https://platform.{_generalSettings.Hostname}";

        if (string.IsNullOrEmpty(continuationToken))
        {
            return $"{host}{url}{queryString}";
        }

        Dictionary<string, StringValues> queryParams = QueryHelpers.ParseQuery(queryString);

        var flattenedQueryParams = queryParams
            .SelectMany(
                x => x.Value,
                (col, value) => new KeyValuePair<string, string>(col.Key, value)
            )
            .Where(e => e.Key != "continuationToken");

        var queryBuilder = new QueryBuilder(flattenedQueryParams)
        {
            { "continuationToken", continuationToken },
        };

        var newQueryString = queryBuilder.ToQueryString().Value;

        return $"{host}{url}{newQueryString}";
    }

    /// <summary>
    /// Validates app id
    /// </summary>
    private static string ValidateAppId(string app)
    {
        if (string.IsNullOrEmpty(app) || !app.Contains('/'))
        {
            throw new ArgumentException("App id can not be null or empty and must contain a slash");
        }

        // To make sonarcloud happy
        return app.Replace(Environment.NewLine, null);
    }
}
