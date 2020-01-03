using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
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

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="instanceEventRepository">the instance event repository service</param>
        /// <param name="applicationRepository">the application repository handler</param>
        /// <param name="logger">the logger</param>
        /// <param name="pdp">the policy decision point.</param>
        public InstancesController(
            IInstanceRepository instanceRepository,
            IInstanceEventRepository instanceEventRepository,
            IApplicationRepository applicationRepository,
            ILogger<InstancesController> logger,
            IPDP pdp)
        {
            _instanceRepository = instanceRepository;
            _instanceEventRepository = instanceEventRepository;
            _applicationRepository = applicationRepository;
            _pdp = pdp;
            _logger = logger;
        }

        /// <summary>
        /// Get all instances that match the given query parameters. Parameters can be combined. Unknown or illegal parameter values will result in 400 - bad request.
        /// </summary>
        /// <param name="org">application owner</param>
        /// <param name="appId">application id</param>
        /// <param name="currentTaskId">running process current task id</param>
        /// <param name="processIsComplete">is process complete</param>
        /// <param name="processEndEvent">process end state</param>
        /// <param name="processEnded">process ended value</param>
        /// <param name="instanceOwnerPartyId">instance owner id</param>
        /// <param name="labels">labels</param>
        /// <param name="lastChanged">last changed date</param>
        /// <param name="created">created time</param>
        /// <param name="visibleAfter">the visible after date time</param>
        /// <param name="dueBefore">the due before date time</param>
        /// <param name="continuationToken">continuation token</param>
        /// <param name="size">the page size</param>
        /// <returns>list of all instances for given instance owner</returns>
        /// <!-- GET /instances?org=tdd or GET /instances?appId=tdd/app2 -->
        [Authorize(Policy = AuthzConstants.POLICY_SCOPE_INSTANCE_READ)]
        [HttpGet]
        [ProducesResponseType(typeof(QueryResponse<Instance>), 200)]
        public async Task<ActionResult> GetInstances(
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

            if (string.IsNullOrEmpty(org) && string.IsNullOrEmpty(appId))
            {
                return BadRequest("Org or AppId must be defined.");
            }

            org = string.IsNullOrEmpty(org) ? appId.Split('/')[0] : org;

            _logger.LogInformation($" // InstancesController // GetInstances // Tyring to get instances for org: {org}");

            if (!AuthorizationHelper.VerifyOrgInClaimPrincipal(org, HttpContext.User))
            {
                return Forbid();
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
                InstanceQueryResponse result = await _instanceRepository.GetInstancesOfApplication(queryParams, continuationToken, pageSize);

                if (!string.IsNullOrEmpty(result.Exception))
                {
                    return BadRequest(result.Exception);
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
                result.Instances.ForEach(i => AddSelfLinks(Request, i));

                return Ok(response);
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to perform query on instances due to: {e}");
                return StatusCode(500, $"Unable to perform query on instances due to: {e.Message}");
            }
        }

        /// <summary>
        /// Gets an instance for a given instance id.
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner id.</param>
        /// <param name="instanceGuid">the guid of the instance.</param>
        /// <returns>an instance.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        [ProducesResponseType(typeof(Instance), 200)]
        public async Task<ActionResult> Get(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            try
            {
                Instance result = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);

                AddSelfLinks(Request, result);

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
        /// <param name="instance">instance</param>
        /// <returns>instance object</returns>
        /// <!-- POST /instances?appId={appId} -->
        [Authorize]
        [HttpPost]
        [Consumes("application/json")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(Instance), 201)]
        public async Task<ActionResult> Post(string appId, [FromBody] Instance instance)
        {
            // check if metadata exists
            Application appInfo = GetApplicationOrError(appId, out ActionResult appInfoError);
            if (appInfoError != null)
            {
                return appInfoError;
            }

            if (string.IsNullOrWhiteSpace(instance.InstanceOwner.PartyId))
            {
                return BadRequest("Cannot create an instance without an instanceOwner.PartyId.");
            }

            // Checking that user is authorized to instantiate.
            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(appInfo.Org, appInfo.Id.Split('/')[1], HttpContext.User, "instantiate", instance.InstanceOwner.PartyId.ToString(), null);
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
                await DispatchEvent(InstanceEventType.Created.ToString(), storedInstance);
                _logger.LogInformation($"Created instance: {storedInstance.Id}");

                AddSelfLinks(Request, storedInstance);

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
        /// Updates an instance.
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner party id</param>
        /// <param name="instanceGuid">instance guid</param>
        /// <param name="instance">instance with updated parameters</param>
        /// <returns>The updated instance</returns>
        [Authorize]
        [HttpPut("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        [ProducesResponseType(typeof(Instance), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> Put(int instanceOwnerPartyId, Guid instanceGuid, [FromBody] Instance instance)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance existingInstance;
            try
            {
                existingInstance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);
            }
            catch (Exception e)
            {
                string message = $"Unable to find instance {instanceId} to update: {e}";
                _logger.LogError(message);

                return NotFound(message);
            }

            existingInstance.AppOwner = instance.AppOwner;

            /* ignore process changes */

            existingInstance.Status = instance.Status;
            existingInstance.Title = instance.Title;

            DateTime? dueBefore = DateTimeHelper.ConvertToUniversalTime(instance.DueBefore);
            existingInstance.DueBefore ??= dueBefore;

            DateTime? visibleAfter = DateTimeHelper.ConvertToUniversalTime(instance.VisibleAfter);
            existingInstance.VisibleAfter ??= visibleAfter;

            existingInstance.LastChangedBy = GetUserId();
            existingInstance.LastChanged = DateTime.UtcNow;

            Instance result;
            try
            {
                existingInstance.Data = null;
                result = await _instanceRepository.Update(existingInstance);
                await DispatchEvent(InstanceEventType.Saved.ToString(), result);
                AddSelfLinks(Request, result);
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to update instance object {instanceId}. Due to {e}");
                return StatusCode(500, $"Unable to update instance object {instanceId}: {e.Message}");
            }

            return Ok(result);
        }

        /// <summary>
        /// Updates the process of an instance.
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner party id</param>
        /// <param name="instanceGuid">instance guid</param>
        /// <param name="processState">the new process state of the instance</param>
        /// <returns>The updated instance</returns>
        [Authorize]
        [HttpPut("{instanceOwnerPartyId:int}/{instanceGuid:guid}/process")]
        [ProducesResponseType(typeof(Instance), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> PutProcess(
            int instanceOwnerPartyId,
            Guid instanceGuid,
            [FromBody] ProcessState processState)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance existingInstance;
            try
            {
                existingInstance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);
            }
            catch (Exception e)
            {
                string message = $"Unable to find instance {instanceId} to update: {e}";
                _logger.LogError(message);

                return NotFound(message);
            }

            if (existingInstance == null)
            {
                return NotFound();
            }

            string altinnTaskType = existingInstance.Process?.CurrentTask?.AltinnTaskType;
            bool authorized = await Authorize(altinnTaskType, existingInstance);
            if (!authorized)
            {
                return Forbid();
            }

            // Archiving instance if process was ended
            if (existingInstance.Process.Ended == null && processState.Ended != null)
            {
                existingInstance.Status.Archived = processState.Ended;
            }

            existingInstance.Process = processState;
            existingInstance.LastChangedBy = GetUserId();
            existingInstance.LastChanged = DateTime.UtcNow;

            Instance result;
            try
            {
                result = await _instanceRepository.Update(existingInstance);

                AddSelfLinks(Request, result);
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to update instance object {instanceId}. Due to {e}");
                return StatusCode(500, $"Unable to update instance object {instanceId}: {e.Message}");
            }

            return Ok(result);
        }

        /// <summary>.
        /// Delete an instance
        /// </summary>
        /// <param name="instanceGuid">instance guid</param>
        /// <param name="instanceOwnerPartyId">instance owner party id</param>
        /// <param name="hard">if true hard delete will take place. if false, the instance gets its status.softDelete attribut set to todays date and time.</param>
        /// <returns>(202) updated instance object or (204) no content if hard delete</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpDelete("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        [ProducesResponseType(typeof(Instance), 202)] // Accepted
        [ProducesResponseType(204)] // No Content
        [ProducesResponseType(404)]
        public async Task<ActionResult> Delete(Guid instanceGuid, int instanceOwnerPartyId, bool? hard)
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

                    return Accepted(softDeletedInstance);
                }
                catch (Exception e)
                {
                    _logger.LogError($"Unexpeced exception when updating instance after soft delete: {e}");
                    return StatusCode(500, $"Unexpected exception when updating instance after soft delete: {e.Message}");
                }
            }
        }

        private async Task<bool> Authorize(string currentTaskType, Instance instance)
        {
            string actionType;
            if (string.IsNullOrEmpty(currentTaskType) || currentTaskType.Equals("data"))
            {
                actionType = "write";
            }
            else
            {
                actionType = currentTaskType;
            }

            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(org, app, HttpContext.User, actionType, null, instance.Id);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);
            if (response?.Response == null)
            {
                _logger.LogInformation($"// Instance Controller // Authorization to update Process failed: {JsonConvert.SerializeObject(request)}.");
                return false;
            }

            bool authorized = DecisionHelper.ValidatePdpDecision(response.Response, HttpContext.User);
            return authorized;
        }

        /// <summary>
        ///   Annotate instance with self links to platform for the instance and each of its data elements.
        /// </summary>
        /// <param name="request">the http request which has the path to the request</param>
        /// <param name="instance">the instance to annotate</param>
        public static void AddSelfLinks(HttpRequest request, Instance instance)
        {
            string selfLink = ComputeInstanceSelfLink(request, instance);

            instance.SelfLinks ??= new ResourceLinks();
            instance.SelfLinks.Platform = selfLink;

            if (instance.Data != null)
            {
                foreach (DataElement dataElement in instance.Data)
                {
                    AddDataSelfLinks(selfLink, dataElement);
                }
            }
        }

        /// <summary>
        /// Computes the self link (url) to an instance.
        /// </summary>
        /// <param name="request">the http request that has scheme, host and path properties</param>
        /// <param name="instance">the instance which has the instance id</param>
        /// <returns>A string that contains the self link url to the instance</returns>
        public static string ComputeInstanceSelfLink(HttpRequest request, Instance instance)
        {
            string selfLink = $"https://{request.Host.ToUriComponent()}{request.Path}";

            int start = selfLink.IndexOf("/instances", StringComparison.Ordinal);
            selfLink = selfLink.Substring(0, start) + "/instances";

            selfLink += $"/{instance.Id}";
            return selfLink;
        }

        /// <summary>
        /// Adds a self link to the data element.
        /// </summary>
        /// <param name="instanceSelfLink">the url to the parent instance</param>
        /// <param name="dataElement">the data element to add self link to</param>
        public static void AddDataSelfLinks(string instanceSelfLink, DataElement dataElement)
        {
            dataElement.SelfLinks ??= new ResourceLinks();

            dataElement.SelfLinks.Platform = $"{instanceSelfLink}/data/{dataElement.Id}";
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
                Title = instanceTemplate.Title,
                Status = instanceTemplate.Status,
                DueBefore = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.DueBefore),
                AppOwner = new ApplicationOwnerState
                {
                    Labels = instanceTemplate.AppOwner?.Labels,
                },
            };

            // copy applications title to presentation field if not set by instance template
            if (createdInstance.Title == null && appInfo.Title != null)
            {
                LanguageString presentation = new LanguageString();

                foreach (KeyValuePair<string, string> title in appInfo.Title)
                {
                    presentation.Add(title.Key, title.Value);
                }

                createdInstance.Title = presentation;
            }

            createdInstance.Data = new List<DataElement>();

            createdInstance.Process = instanceTemplate.Process;

            return createdInstance;
        }

        private Application GetApplicationOrError(string appId, out ActionResult errorResult)
        {
            errorResult = null;
            Application appInfo = null;

            try
            {
                string org = appId.Split("/")[0];

                appInfo = _applicationRepository.FindOne(appId, org).Result;
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

            return appInfo;
        }

        private async Task DispatchEvent(string eventType, Instance instance)
        {
            InstanceEvent instanceEvent = new InstanceEvent
            {
                EventType = eventType,
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
