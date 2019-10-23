using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using global::Storage.Interface.Enums;
using global::Storage.Interface.Models;
using Halcyon.HAL;
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
        /// Gets all instances for a given instance owner.
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <returns>list of instances</returns>
        [HttpGet("{instanceOwnerId:int}")]
        public async Task<ActionResult> GetInstanceOwners(int instanceOwnerId)
        {
            List<Instance> result = await _instanceRepository.GetInstancesOfInstanceOwner(instanceOwnerId);
            if (result == null || result.Count == 0)
            {
                return NotFound($"Did not find any instances for instanceOwnerId={instanceOwnerId}");
            }

            result.ForEach(i => AddSelfLinks(Request, i));

            return Ok(result);
        }

        /// <summary>
        /// Get all instances for a given org or appId. Only one parameter at the time.
        /// </summary>
        /// <param name="org">application owner</param>
        /// <param name="appId">application id</param>
        /// <param name="currentTaskId">running process current task id</param>
        /// <param name="processIsComplete">is process complete</param>
        /// <param name="processIsInError">is process in error</param>
        /// <param name="processEndState">process end state</param>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <param name="labels">labels</param>
        /// <param name="lastChangedDateTime">last changed date</param>
        /// <param name="createdDateTime">created time</param>
        /// <param name="visibleDateTime">the visible date time</param>
        /// <param name="dueDateTime">the due date time</param>
        /// <param name="continuationToken">continuation token</param>
        /// <param name="size">the page size</param>
        /// <returns>list of all instances for given instanceowner</returns>
        /// <!-- GET /instances?org=tdd or GET /instances?appId=tdd/app2 -->
        [HttpGet]
        public async Task<ActionResult> GetInstances(
            string org,
            string appId,
            [FromQuery(Name = "process.currentTask")] string currentTaskId,
            [FromQuery(Name = "process.isComplete")] bool? processIsComplete,
            [FromQuery(Name = "process.isInError")] bool? processIsInError,
            [FromQuery(Name = "process.endState")] string processEndState,
            [FromQuery] int? instanceOwnerId,
            [FromQuery] string labels,
            [FromQuery] string lastChangedDateTime,
            [FromQuery] string createdDateTime,
            [FromQuery] string visibleDateTime,
            [FromQuery] string dueDateTime,
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

                HALResponse response = new HALResponse(result);

                if (continuationToken == null)
                {
                    string selfUrl = $"{host}{url}{query}";

                    result.Self = selfUrl;

                    Link selfLink = new Link("self", selfUrl);
                    response.AddLinks(selfLink);
                }
                else
                {
                    string selfQueryString = BuildQueryStringWithOneReplacedParameter(
                        queryParams,
                        "continuationToken",
                        selfContinuationToken);

                    string selfUrl = $"{host}{url}{selfQueryString}";

                    result.Self = selfUrl;

                    Link selfLink = new Link("self", selfUrl);
                    response.AddLinks(selfLink);
                }

                if (nextContinuationToken != null)
                {
                    string nextQueryString = BuildQueryStringWithOneReplacedParameter(
                        queryParams,
                        "continuationToken",
                        nextContinuationToken);

                    string nextUrl = $"{host}{url}{nextQueryString}";

                    result.Next = nextUrl;

                    Link nextLink = new Link("next", nextUrl);
                    response.AddLinks(nextLink);
                }

                // add self links to platform
                result.Instances.ForEach(i => AddSelfLinks(Request, i));

                StringValues acceptHeader = Request.Headers["Accept"];
                if (acceptHeader.Any() && acceptHeader.Contains("application/hal+json"))
                {
                    /* Response object should be expressed as HAL (Hypertext Application Language) with _embedded and _links.
                     * Thus we reset the response object's inline instances, next and self elements.*/

                    response.AddEmbeddedCollection("instances", result.Instances);
                    result.Instances = null;
                    result.Next = null;
                    result.Self = null;
                }

                return Ok(response);
            }
            catch (Exception e)
            {
                logger.LogError("exception", e);
                return StatusCode(500, $"Unable to perform query due to: {e.Message}");
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
                    dataElement.DataLinks ??= new ResourceLinks();

                    dataElement.DataLinks.Platform = $"{selfLink}/data/{dataElement.Id}";
                }
            }
        }

        /// <summary>
        /// Gets an instance for a given instance id.
        /// </summary>
        /// <param name="instanceOwnerId">instance owner id.</param>
        /// <param name="instanceGuid">the guid of the instance.</param>
        /// <returns>an instance.</returns>
        [HttpGet("{instanceOwnerId:int}/{instanceGuid:guid}")]
        public async Task<ActionResult> Get(int instanceOwnerId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            Instance result;
            try
            {
                result = await _instanceRepository.GetOne(instanceId, instanceOwnerId);

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
        public async Task<ActionResult> Post(string appId, [FromBody] Instance instance)
        {
            // check if metadata exists
            Application appInfo = GetApplicationOrError(appId, out ActionResult appInfoError);
            if (appInfoError != null)
            {
                return appInfoError;
            }

            if (string.IsNullOrWhiteSpace(instance.InstanceOwnerId))
            {
                return BadRequest("Cannot create an instance without an instanceOwnerId.");
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

                return Ok(storedInstance);
            }
            catch (Exception storageException)
            {
                logger.LogError($"Unable to create {appId} instance for {instance.InstanceOwnerId} due to {storageException}");

                // compensating action - delete instance
                await _instanceRepository.Delete(storedInstance);
                logger.LogError($"Deleted instance {storedInstance.Id}");

                return StatusCode(500, $"Unable to create {appId} instance for {instance.InstanceOwnerId} due to {storageException.Message}");
            }
        }

        /// <summary>
        /// Updates an instance
        /// </summary>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="instanceGuid">instance id</param>
        /// <param name="instance">instance</param>
        /// <returns>The updated instance</returns>
        [HttpPut("{instanceOwnerId:int}/{instanceGuid:guid}")]
        public async Task<ActionResult> Put(int instanceOwnerId, Guid instanceGuid, [FromBody] Instance instance)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            Instance existingInstance;
            try
            {
                existingInstance = await _instanceRepository.GetOne(instanceId, instanceOwnerId);
            }
            catch (Exception e)
            {
                string message = $"Unable to find instance {instanceId} to update: {e}";
                logger.LogError(message);

                return NotFound(message);
            }

            existingInstance.AppOwnerState = instance.AppOwnerState;
            existingInstance.Process = instance.Process;
            existingInstance.InstanceState = instance.InstanceState;

            existingInstance.PresentationField = instance.PresentationField;
            existingInstance.DueDateTime = DateTimeHelper.ConvertToUniversalTime(instance.DueDateTime);
            existingInstance.VisibleDateTime = DateTimeHelper.ConvertToUniversalTime(instance.VisibleDateTime);
            existingInstance.Labels = instance.Labels;

            existingInstance.LastChangedBy = User.Identity.Name;
            existingInstance.LastChangedDateTime = DateTime.UtcNow;

            Instance result;
            try
            {
                result = await _instanceRepository.Update(existingInstance);
                await DispatchEvent(instance.InstanceState.IsArchived ? InstanceEventType.Submited.ToString() : InstanceEventType.Saved.ToString(), result);
                AddSelfLinks(Request, result);
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unable to update instance object {instanceId}: {e.Message}");
            }

            return Ok(result);
        }

        /// <summary>
        /// Delete an instance
        /// </summary>
        /// <param name="instanceGuid">instance id</param>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="hard">if true hard delete will take place</param>
        /// <returns>updated instance object</returns>
        /// DELETE /instances/{instanceId}?instanceOwnerId={instanceOwnerId}
        [HttpDelete("{instanceOwnerId:int}/{instanceGuid:guid}")]
        public async Task<ActionResult> Delete(Guid instanceGuid, int instanceOwnerId, bool? hard)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            Instance instance;
            try
            {
                instance = await _instanceRepository.GetOne(instanceId, instanceOwnerId);
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    return NotFound($"Didn't find the object that should be deleted with instanceId={instanceId}");
                }

                return StatusCode(500, $"Unknown database exception in delete: {dce}");
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unknown exception in delete: {e}");
            }

            if (hard.HasValue && hard == true)
            {
                try
                {
                    await _instanceRepository.Delete(instance);

                    return Ok(true);
                }
                catch (Exception e)
                {
                    return StatusCode(500, $"Unknown exception in delete: {e}");
                }
            }
            else
            {
                instance.InstanceState.IsDeleted = true;
                instance.LastChangedBy = User.Identity.Name;
                instance.LastChangedDateTime = instance.InstanceState.DeletedDateTime = DateTime.UtcNow;

                try
                {
                    Instance softDeletedInstance = await _instanceRepository.Update(instance);

                    return Ok(softDeletedInstance);
                }
                catch (Exception e)
                {
                    return StatusCode(500, $"Unknown exception in delete: {e}");
                }
            }
        }

        private Instance CreateInstanceFromTemplate(Application appInfo, Instance instanceTemplate, DateTime creationTime, string userId)
        {
            Instance createdInstance = new Instance()
            {
                InstanceOwnerId = instanceTemplate.InstanceOwnerId.ToString(),
                CreatedBy = userId,
                CreatedDateTime = creationTime,
                LastChangedBy = userId,
                LastChangedDateTime = creationTime,
                AppId = appInfo.Id,
                Org = appInfo.Org,
                VisibleDateTime = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.VisibleDateTime),
                DueDateTime = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.DueDateTime),
                Labels = instanceTemplate.Labels,
                PresentationField = instanceTemplate.PresentationField,
                InstanceState = new InstanceState { IsArchived = false, IsDeleted = false, IsMarkedForHardDelete = false },
            };

            // copy applications title to presentation field if not set by instance template
            if (createdInstance.PresentationField == null && appInfo.Title != null)
            {
                LanguageString presentation = new LanguageString();

                foreach (KeyValuePair<string, string> title in appInfo.Title)
                {
                    presentation.Add(title.Key, title.Value);
                }

                createdInstance.PresentationField = presentation;
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
                AuthenticationLevel = 0, // update when authentication is turned on
                EventType = eventType,
                InstanceId = instance.Id,
                InstanceOwnerId = instance.InstanceOwnerId,
                UserId = 0, // update when authentication is turned on
                ProcessInfo = instance.Process,
                CreatedDateTime = DateTime.UtcNow,
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
