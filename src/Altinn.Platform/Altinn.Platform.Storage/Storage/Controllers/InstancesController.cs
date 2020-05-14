using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Azure.Documents;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// Handles operations for the application instance resource
    /// </summary>
    [Route("storage/api/v1/instances")]
    [ApiController]
    public class InstancesController : ControllerBase
    {
        private readonly IInstanceRepository _instanceRepository;
        private readonly IInstanceEventRepository _instanceEventRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly ILogger _logger;
        private readonly IPDP _pdp;
        private readonly AuthorizationHelper _authzHelper;
        private readonly string _storageBaseAndHost;
        private const string INSTANCE_READ_SCOPE = "altinn:instances.read";

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="instanceEventRepository">the instance event repository service</param>
        /// <param name="applicationRepository">the application repository handler</param>
        /// <param name="logger">the logger</param>
        /// <param name="authzLogger">the logger for the authorization helper</param>
        /// <param name="pdp">the policy decision point.</param>
        /// <param name="settings">the general settings.</param>
        public InstancesController(
            IInstanceRepository instanceRepository,
            IInstanceEventRepository instanceEventRepository,
            IApplicationRepository applicationRepository,
            ILogger<InstancesController> logger,
            ILogger<AuthorizationHelper> authzLogger,
            IPDP pdp,
            IOptions<GeneralSettings> settings)
        {
            _instanceRepository = instanceRepository;
            _instanceEventRepository = instanceEventRepository;
            _applicationRepository = applicationRepository;
            _pdp = pdp;
            _logger = logger;
            _storageBaseAndHost = $"{settings.Value.Hostname}/storage/api/v1/";
            _authzHelper = new AuthorizationHelper(pdp, authzLogger);
        }

        /// <summary>
        /// Get all instances that match the given query parameters. Parameters can be combined. Unknown or illegal parameter values will result in 400 - bad request.
        /// </summary>
        /// <param name="org">application owner.</param>
        /// <param name="appId">application id.</param>
        /// <param name="currentTaskId">Running process current task id.</param>
        /// <param name="processIsComplete">Is process complete.</param>
        /// <param name="processEndEvent">Process end state.</param>
        /// <param name="processEnded">Process ended value.</param>
        /// <param name="instanceOwnerPartyId">Instance owner id.</param>
        /// <param name="labels">Labels.</param>
        /// <param name="lastChanged">Last changed date.</param>
        /// <param name="created">Created time.</param>
        /// <param name="visibleAfter">The visible after date time.</param>
        /// <param name="dueBefore">The due before date time.</param>
        /// <param name="continuationToken">Continuation token.</param>
        /// <param name="size">The page size.</param>
        /// <returns>List of all instances for given instance owner.</returns>
        /// <!-- GET /instances?org=tdd or GET /instances?appId=tdd/app2 -->
        [Authorize]
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<QueryResponse<Instance>>> GetInstances(
            [FromQuery] string org,
            [FromQuery] string appId,
            [FromQuery(Name = "process.currentTask")] string currentTaskId,
            [FromQuery(Name = "process.isComplete")] bool? processIsComplete,
            [FromQuery(Name = "process.endEvent")] string processEndEvent,
            [FromQuery(Name = "process.ended")] string processEnded,
            [FromQuery(Name = "instanceOwner.partyId")] int? instanceOwnerPartyId,
            [FromQuery(Name = "appOwner.labels")] string labels,
            [FromQuery] string lastChanged,
            [FromQuery] string created,
            [FromQuery(Name = "visibleAfter")] string visibleAfter,
            [FromQuery] string dueBefore,
            string continuationToken,
            int? size)
        {
            int pageSize = size ?? 100;
            string selfContinuationToken = null;

            bool isOrgQuerying = false;

            // if user is org
            string orgClaim = User.GetOrg();
            int? userId = User.GetUserIdAsInt();

            if (orgClaim != null)
            {
                isOrgQuerying = true;

                if (!_authzHelper.ContainsRequiredScope(INSTANCE_READ_SCOPE, User))
                {
                    return Forbid();
                }

                if (string.IsNullOrEmpty(org) && string.IsNullOrEmpty(appId))
                {
                    return BadRequest("Org or AppId must be defined.");
                }

                org = string.IsNullOrEmpty(org) ? appId.Split('/')[0] : org;

                if (!orgClaim.Equals(org, StringComparison.InvariantCultureIgnoreCase))
                {
                    return Forbid();
                }
            }
            else if (userId != null)
            {
                if (instanceOwnerPartyId == null)
                {
                    return BadRequest("InstanceOwnerPartyId must be defined.");
                }
            }
            else
            {
                return BadRequest();
            }

            if (!string.IsNullOrEmpty(continuationToken))
            {
                selfContinuationToken = continuationToken;
                continuationToken = HttpUtility.UrlDecode(continuationToken);
            }

            Dictionary<string, StringValues> queryParams = QueryHelpers.ParseQuery(Request.QueryString.Value);

            string host = $"{Request.Scheme}://{Request.Host.ToUriComponent()}";
            string url = Request.Path;
            string query = Request.QueryString.Value;

            _logger.LogInformation($"uri = {url}{query}");

            try
            {
                InstanceQueryResponse result = await _instanceRepository.GetInstancesFromQuery(queryParams, continuationToken, pageSize);

                if (!string.IsNullOrEmpty(result.Exception))
                {
                    return BadRequest(result.Exception);
                }

                if (!isOrgQuerying)
                {
                    int originalCount = result.Instances.Count;
                    result.Instances = await _authzHelper.AuthorizeInstances(User, result.Instances);
                    result.Count = result.Instances.Count;
                    result.TotalHits = result.TotalHits - (originalCount - result.Instances.Count);
                }

                string nextContinuationToken = HttpUtility.UrlEncode(result.ContinuationToken);
                result.ContinuationToken = null;

                QueryResponse<Instance> response = new QueryResponse<Instance>
                {
                    Instances = result.Instances,
                    Count = result.Instances.Count,
                    TotalHits = result.TotalHits ?? 0
                };

                if (continuationToken == null)
                {
                    string selfUrl = $"{host}{url}{query}";
                    response.Self = selfUrl;
                }
                else
                {
                    string selfQueryString = BuildQueryStringWithOneReplacedParameter(
                        queryParams,
                        "continuationToken",
                        selfContinuationToken);

                    string selfUrl = $"{host}{url}{selfQueryString}";

                    response.Self = selfUrl;
                }

                if (nextContinuationToken != null)
                {
                    string nextQueryString = BuildQueryStringWithOneReplacedParameter(
                        queryParams,
                        "continuationToken",
                        nextContinuationToken);

                    string nextUrl = $"{host}{url}{nextQueryString}";

                    response.Next = nextUrl;
                }

                // add self links to platform
                result.Instances.ForEach(i => i.SetPlatformSelflink(_storageBaseAndHost));

                return Ok(response);
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to perform query on instances due to: {e}");
                return StatusCode(500, $"Unable to perform query on instances due to: {e.Message}");
            }
        }

        /// <summary>
        /// Gets a specific instance with the given instance id.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance to retrieve.</param>
        /// <returns>The information about the specific instance.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult<Instance>> Get(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            try
            {
                Instance result = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);
                result.SetPlatformSelflink(_storageBaseAndHost);

                return Ok(result);
            }
            catch (Exception e)
            {
                return NotFound($"Unable to find instance {instanceId}: {e}");
            }
        }

        /// <summary>
        /// Inserts new instance into the instance collection.
        /// </summary>
        /// <param name="appId">the application id</param>
        /// <param name="instance">The instance details to store.</param>
        /// <returns>The stored instance.</returns>
        /// <!-- POST /instances?appId={appId} -->
        [Authorize]
        [HttpPost]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<Instance>> Post(string appId, [FromBody] Instance instance)
        {
            (Application appInfo, ActionResult appInfoError) = await GetApplicationOrErrorAsync(appId);
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            if (appInfoError != null)
            {
                return appInfoError;
            }

            if (string.IsNullOrWhiteSpace(instance.InstanceOwner.PartyId))
            {
                return BadRequest("Cannot create an instance without an instanceOwner.PartyId.");
            }

            // Checking that user is authorized to instantiate.
            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(appInfo.Org, appInfo.Id.Split('/')[1], HttpContext.User, "instantiate", instanceOwnerPartyId, null);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

            if (response?.Response == null)
            {
                _logger.LogInformation($"// Instances Controller // Authorization of instantiation failed with request: {JsonConvert.SerializeObject(request)}.");
                return Forbid();
            }

            bool authorized = DecisionHelper.ValidatePdpDecision(response.Response, HttpContext.User);

            if (!authorized)
            {
                return Forbid();
            }

            Instance storedInstance = new Instance();
            try
            {
                DateTime creationTime = DateTime.UtcNow;
                string userId = GetUserId();

                Instance instanceToCreate = CreateInstanceFromTemplate(appInfo, instance, creationTime, userId);
                storedInstance = await _instanceRepository.Create(instanceToCreate);
                await DispatchEvent(InstanceEventType.Created, storedInstance);
                _logger.LogInformation($"Created instance: {storedInstance.Id}");
                storedInstance.SetPlatformSelflink(_storageBaseAndHost);

                return Created(storedInstance.SelfLinks.Platform, storedInstance);
            }
            catch (Exception storageException)
            {
                _logger.LogError($"Unable to create {appId} instance for {instance.InstanceOwner.PartyId} due to {storageException}");

                // compensating action - delete instance
                await _instanceRepository.Delete(storedInstance);

                _logger.LogError($"Deleted instance {storedInstance.Id}");
                return StatusCode(500, $"Unable to create {appId} instance for {instance.InstanceOwner.PartyId} due to {storageException.Message}");
            }
        }

        /// <summary>
        /// Delete an instance.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that should be deleted.</param>
        /// <param name="hard">if true hard delete will take place. if false, the instance gets its status.softDelete attribut set to todays date and time.</param>
        /// <returns>Information from the deleted instance.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_DELETE)]
        [HttpDelete("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult<Instance>> Delete(int instanceOwnerPartyId, Guid instanceGuid, bool? hard)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance instance;
            try
            {
                instance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    return NotFound($"Didn't find the object that should be deleted with instanceId={instanceId}");
                }

                _logger.LogError($"Cannot delete instance {instanceId}. Due to {dce}");
                return StatusCode(500, $"Unknown database exception in delete: {dce}");
            }
            catch (Exception e)
            {
                _logger.LogError($"Cannot delete instance {instanceId}. Due to {e}");
                return StatusCode(500, $"Unknown exception in delete: {e}");
            }

            if (hard.HasValue && hard == true)
            {
                try
                {
                    await _instanceRepository.Delete(instance);

                    return NoContent();
                }
                catch (Exception e)
                {
                    _logger.LogError($"Unexpected exception in delete: {e}");
                    return StatusCode(500, $"Unexpected exception in delete: {e.Message}");
                }
            }
            else
            {
                DateTime now = DateTime.UtcNow;

                instance.Status.SoftDeleted = now;
                instance.LastChangedBy = GetUserId();
                instance.LastChanged = now;

                try
                {
                    Instance softDeletedInstance = await _instanceRepository.Update(instance);

                    return Ok(softDeletedInstance);
                }
                catch (Exception e)
                {
                    _logger.LogError($"Unexpeced exception when updating instance after soft delete: {e}");
                    return StatusCode(500, $"Unexpected exception when updating instance after soft delete: {e.Message}");
                }
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
        /// <returns>Returns a list of the process events.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_COMPLETE)]
        [HttpPost("{instanceOwnerPartyId:int}/{instanceGuid:guid}/complete")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Produces("application/json")]
        public async Task<ActionResult<Instance>> AddCompleteConfirmation(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance instance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);

            string org = User.GetOrg();

            instance.CompleteConfirmations ??= new List<CompleteConfirmation>();
            if (instance.CompleteConfirmations.Any(cc => cc.StakeholderId == org))
            {
                instance.SetPlatformSelflink(_storageBaseAndHost);
                return Ok(instance);
            }

            instance.CompleteConfirmations.Add(new CompleteConfirmation { StakeholderId = org, ConfirmedOn = DateTime.UtcNow });
            instance.LastChanged = DateTime.UtcNow;
            instance.LastChangedBy = User.GetUserOrOrgId();

            Instance updatedInstance;
            try
            {
                updatedInstance = await _instanceRepository.Update(instance);
                updatedInstance.SetPlatformSelflink(_storageBaseAndHost);
            }
            catch (Exception e)
            {
                _logger.LogError(e, $"Unable to update instance {instanceId}");
                return StatusCode(StatusCodes.Status500InternalServerError);
            }

            await DispatchEvent(InstanceEventType.ConfirmedComplete, updatedInstance);

            return Ok(updatedInstance);
        }

        private Instance CreateInstanceFromTemplate(Application appInfo, Instance instanceTemplate, DateTime creationTime, string userId)
        {
            Instance createdInstance = new Instance()
            {
                InstanceOwner = instanceTemplate.InstanceOwner,
                CreatedBy = userId,
                Created = creationTime,
                LastChangedBy = userId,
                LastChanged = creationTime,
                AppId = appInfo.Id,
                Org = appInfo.Org,
                VisibleAfter = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.VisibleAfter),
                Status = instanceTemplate.Status,
                DueBefore = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.DueBefore),
                AppOwner = new ApplicationOwnerState
                {
                    Labels = instanceTemplate.AppOwner?.Labels,
                },
            };

            createdInstance.Data = new List<DataElement>();

            createdInstance.Process = instanceTemplate.Process;

            return createdInstance;
        }

        private async Task<(Application, ActionResult)> GetApplicationOrErrorAsync(string appId)
        {
            ActionResult errorResult = null;
            Application appInfo = null;

            try
            {
                string org = appId.Split("/")[0];

                appInfo = await _applicationRepository.FindOne(appId, org);
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    errorResult = NotFound($"Did not find application with appId={appId}");
                }
                else
                {
                    errorResult = StatusCode(500, $"Document database error: {dce}");
                }
            }
            catch (Exception e)
            {
                errorResult = StatusCode(500, $"Unable to perform request: {e}");
            }

            return (appInfo, errorResult);
        }

        private async Task DispatchEvent(InstanceEventType eventType, Instance instance)
        {
            InstanceEvent instanceEvent = new InstanceEvent
            {
                EventType = eventType.ToString(),
                InstanceId = instance.Id,
                InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                User = new PlatformUser
                {
                    UserId = User.GetUserIdAsInt(),
                    AuthenticationLevel = User.GetAuthenticationLevel(),
                    OrgId = User.GetOrg(),
                },

                ProcessInfo = instance.Process,
                Created = DateTime.UtcNow,
            };

            await _instanceEventRepository.InsertInstanceEvent(instanceEvent);
        }

        private static string BuildQueryStringWithOneReplacedParameter(Dictionary<string, StringValues> q, string queryParamName, string newParamValue)
        {
            List<KeyValuePair<string, string>> items = q.SelectMany(
                x => x.Value,
                (col, value) => new KeyValuePair<string, string>(col.Key, value))
                .ToList();

            items.RemoveAll(x => x.Key == queryParamName);

            var qb = new QueryBuilder(items)
                        {
                            { queryParamName, newParamValue }
                        };

            string nextQueryString = qb.ToQueryString().Value;

            return nextQueryString;
        }

        private string GetUserId()
        {
            return User.GetUserOrOrgId();
        }
    }
}
