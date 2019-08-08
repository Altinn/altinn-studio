namespace Altinn.Platform.Storage.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using System.Web;
    using Altinn.Platform.Storage.Helpers;
    using Altinn.Platform.Storage.Models;
    using Altinn.Platform.Storage.Repository;
    using global::Storage.Interface.Models;
    using Halcyon.HAL;
    using Microsoft.AspNetCore.Http.Extensions;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.WebUtilities;
    using Microsoft.Azure.Documents;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Primitives;

    /// <summary>
    /// Handles operations for the application instance resource
    /// </summary>
    [Route("storage/api/v1/instances")]
    [ApiController]
    public class InstancesController : Controller
    {
        private readonly IInstanceRepository _instanceRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly ILogger logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="applicationRepository">the application repository handler</param>
        /// <param name="logger">the logger</param>
        public InstancesController(
            IInstanceRepository instanceRepository,
            IApplicationRepository applicationRepository,
            ILogger<InstancesController> logger)
        {
            _instanceRepository = instanceRepository;
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
                result.ContinuationToken = nextContinuationToken;
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
                result.Instances.ForEach(i =>
                {
                    i.SelfLinks = new ResourceLinks
                    {
                        Platform = $"{host}{url}/{i.Id}"
                    };
                });

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
        /// <param name="appId">the applicationid</param>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <param name="instanceTemplate">The instance template to base the new instance on</param>
        /// <returns>instance object</returns>
        /// <!-- POST /instances?appId={appId}&instanceOwnerId={instanceOwnerId} -->
        [HttpPost]
        public async Task<ActionResult> Post(string appId, int? instanceOwnerId, [FromBody] Instance instanceTemplate)
        {
            if (instanceTemplate == null && !instanceOwnerId.HasValue)
            {
                return BadRequest("Missing parameter values: instanceOwnerId must be set");
            }
            else if (!instanceOwnerId.HasValue && (instanceTemplate != null && string.IsNullOrEmpty(instanceTemplate.InstanceOwnerId))) 
            {
                return BadRequest("Missing parameter values: instanceOwnerId must be set");
            }

            string theInstanceOwnerId = null;

            if (instanceOwnerId.HasValue)
            {
                theInstanceOwnerId = instanceOwnerId.Value.ToString();
            }
            else if (instanceTemplate != null)
            {
                theInstanceOwnerId = instanceTemplate.InstanceOwnerId;
            }

            if (instanceTemplate == null)
            {
                instanceTemplate = new Instance();
            }

            // TODO - also check instanceOwnerLookup!!

            // check if metadata exists
            Application appInfo;
            try
            {
                appInfo = GetApplicationInformation(appId);
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    return NotFound($"Did not find application with appId={appId}");
                }
                else
                {
                    return StatusCode(500, $"Document database error: {dce}");
                }
            }
            catch (Exception e) 
            {
                return StatusCode(500, $"Unable to perform request: {e}");
            }

            DateTime creationTime = DateTime.UtcNow;

            string org = appInfo.Org;

            Instance createdInstance = new Instance()
            {
                InstanceOwnerId = theInstanceOwnerId,
                CreatedBy = User.Identity.Name,
                CreatedDateTime = creationTime,
                LastChangedBy = User.Identity.Name,
                LastChangedDateTime = creationTime,
                AppId = appId,
                Org = org,

                VisibleDateTime = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.VisibleDateTime),
                DueDateTime = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.DueDateTime),
                Labels = instanceTemplate.Labels,
                PresentationField = instanceTemplate.PresentationField,

                InstanceState = new InstanceState { IsArchived = false, IsDeleted = false, IsMarkedForHardDelete = false },                
            };
           
            if (instanceTemplate.Process != null)
            {
                createdInstance.Process = instanceTemplate.Process;
            }
            else
            {
                createdInstance.Process = new ProcessState { CurrentTask = "FormFilling_1", IsComplete = false };
            }

            try
            {
                Instance result = await _instanceRepository.Create(createdInstance);
                return Ok(result);
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to create {appId} instance for {theInstanceOwnerId} due to {e}");
                return StatusCode(500, $"Unable to create {appId} instance for {theInstanceOwnerId} due to {e}");
            }
        }

        /// <summary>
        /// Updates an instance
        /// </summary>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="instanceGuid">instance id</param>
        /// <param name="instance">instance</param>
        /// <returns></returns>        
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
                instance.LastChangedDateTime = DateTime.UtcNow;

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

        private Application GetApplicationInformation(string appId)
        {
            string org = appId.Split("/")[0];

            Application application = _applicationRepository.FindOne(appId, org).Result;

            return application;
        }
    }
}
