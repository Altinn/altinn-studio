using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

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
        private readonly ILogger logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="instanceEventRepository">the instance event repository service</param>
        /// <param name="applicationRepository">the application repository handler</param>
        /// <param name="logger">the logger</param>
        public InstancesController(
            IInstanceRepository instanceRepository,
            IInstanceEventRepository instanceEventRepository,
            IApplicationRepository applicationRepository,
            ILogger<InstancesController> logger)
        {
            _instanceRepository = instanceRepository;
            _instanceEventRepository = instanceEventRepository;
            _applicationRepository = applicationRepository;
            this.logger = logger;
        }

        /// <summary>
        /// Gets all instances for a given instance owner. Currently a maximum of 100 instances will be returned.
        /// </summary>
        /// <param name="instanceOwnerPartyId">the instance owner party id</param>
        /// <returns>list of instances</returns>        
        [HttpGet("{instanceOwnerPartyId:int}")]
        [ProducesResponseType(typeof(List<Instance>), 200)]
        public async Task<ActionResult> GetInstanceOwners(int instanceOwnerPartyId)
        {
            List<Instance> result = await _instanceRepository.GetInstancesOfInstanceOwner(instanceOwnerPartyId);
            if (result == null || result.Count == 0)
            {
                return NotFound($"Did not find any instances for instanceOwnerPartyId={instanceOwnerPartyId}");
            }

            result.ForEach(i => AddSelfLinks(Request, i));

            return Ok(result);
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
        /// <returns>list of all instances for given instanceowner</returns>
        /// <!-- GET /instances?org=tdd or GET /instances?appId=tdd/app2 -->
        [HttpGet]
        [ProducesResponseType(typeof(QueryResponse<Instance>), 200)]
        public async Task<ActionResult> GetInstances(
            string org,
            string appId,
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

            if (!string.IsNullOrEmpty(continuationToken))
            {
                selfContinuationToken = continuationToken;
                continuationToken = HttpUtility.UrlDecode(continuationToken);
            }

            Dictionary<string, StringValues> queryParams = QueryHelpers.ParseQuery(Request.QueryString.Value);

            string host = $"{Request.Scheme}://{Request.Host.ToUriComponent()}";
            string url = Request.Path;
            string query = Request.QueryString.Value;

            logger.LogInformation($"uri = {url}{query}");

            try
            {
                InstanceQueryResponse result = await _instanceRepository.GetInstancesOfApplication(queryParams, continuationToken, pageSize);

                if (result.TotalHits == 0)
                {
                    return NotFound($"Did not find any instances");
                }

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
                    TotalHits = result.TotalHits.Value,
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
                logger.LogError($"Unable to perform query on instances due to: {e}");
                return StatusCode(500, $"Unable to perform query on instances due to: {e.Message}");
            }
        }

        /// <summary>
        /// Gets an instance for a given instance id.
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner id.</param>
        /// <param name="instanceGuid">the guid of the instance.</param>
        /// <returns>an instance.</returns>
        [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        [ProducesResponseType(typeof(Instance), 200)]
        public async Task<ActionResult> Get(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance result;
            try
            {
                result = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);

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

            Instance storedInstance = new Instance();
            try
            {
                DateTime creationTime = DateTime.UtcNow;
                string userId = null;

                Instance instanceToCreate = CreateInstanceFromTemplate(appInfo, instance, creationTime, userId);
                storedInstance = await _instanceRepository.Create(instanceToCreate);
                await DispatchEvent(InstanceEventType.Created.ToString(), storedInstance);
                logger.LogInformation($"Created instance: {storedInstance.Id}");

                AddSelfLinks(Request, storedInstance);

                return Created(storedInstance.SelfLinks.Platform, storedInstance);
            }
            catch (Exception storageException)
            {
                logger.LogError($"Unable to create {appId} instance for {instance.InstanceOwner.PartyId} due to {storageException}");

                // compensating action - delete instance
                await _instanceRepository.Delete(storedInstance);

                logger.LogError($"Deleted instance {storedInstance.Id}");
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
                logger.LogError(message);

                return NotFound(message);
            }

            existingInstance.AppOwner = instance.AppOwner;            
            existingInstance.Process = instance.Process;
            existingInstance.Status = instance.Status;

            existingInstance.DueBefore = DateTimeHelper.ConvertToUniversalTime(instance.DueBefore);
            
            existingInstance.LastChangedBy = User.Identity.Name;
            existingInstance.LastChanged = DateTime.UtcNow;

            Instance result;
            try
            {
                result = await _instanceRepository.Update(existingInstance);
                await DispatchEvent(instance.Status.Archived.HasValue ? InstanceEventType.Submited.ToString() : InstanceEventType.Saved.ToString(), result);
                AddSelfLinks(Request, result);
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to update instance object {instanceId}. Due to {e}");
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

                logger.LogError($"Cannot delete instance {instanceId}. Due to {dce}");
                return StatusCode(500, $"Unknown database exception in delete: {dce}");
            }
            catch (Exception e)
            {
                logger.LogError($"Cannot delete instance {instanceId}. Due to {e}");
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
                    logger.LogError($"Unexpected exception in delete: {e}");
                    return StatusCode(500, $"Unexpected exception in delete: {e.Message}");
                }
            }
            else
            {
                DateTime now = DateTime.UtcNow;

                instance.Status.SoftDeleted = now;
                instance.LastChangedBy = User.Identity.Name;
                instance.LastChanged = now;

                try
                {
                    Instance softDeletedInstance = await _instanceRepository.Update(instance);

                    return Accepted(softDeletedInstance);
                }
                catch (Exception e)
                {
                    logger.LogError($"Unexpeced exception when updating instance after soft delete: {e}");
                    return StatusCode(500, $"Unexpected exception when updating instance after soft delete: {e.Message}");
                }
            }
        }

        /// <summary>
        ///   Annotate instance with self links to platform for the instance and each of its data elements.
        /// </summary>
        /// <param name="request">the http request which has the path to the request</param>
        /// <param name="instance">the instance to annotate</param>
        public static void AddSelfLinks(HttpRequest request, Instance instance)
        {
            string selfLink = $"{request.Scheme}://{request.Host.ToUriComponent()}{request.Path}";

            int start = selfLink.IndexOf("/instances");
            selfLink = selfLink.Substring(0, start) + "/instances";

            selfLink += $"/{instance.Id}";

            instance.SelfLinks ??= new ResourceLinks();
            instance.SelfLinks.Platform = selfLink;

            if (instance.Data != null)
            {
                foreach (DataElement dataElement in instance.Data)
                {
                    dataElement.SelfLinks ??= new ResourceLinks();

                    dataElement.SelfLinks.Platform = $"{selfLink}/data/{dataElement.Id}";
                }
            }
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
                Status = new InstanceStatus
                {                    
                },
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
                    UserId = 0, // update when authentication is turned on
                    AuthenticationLevel = 0, // update when authentication is turned on
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
    }
}
