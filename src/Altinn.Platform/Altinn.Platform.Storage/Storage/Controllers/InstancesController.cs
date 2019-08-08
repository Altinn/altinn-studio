namespace Altinn.Platform.Storage.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Net;
    using System.Net.Http;
    using System.Text;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Configuration;
    using Altinn.Platform.Storage.Models;
    using Altinn.Platform.Storage.Repository;
    using global::Storage.Interface.Models;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Azure.Documents;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;
    using Newtonsoft.Json;

    /// <summary>
    /// Handles operations for the application instance resource
    /// </summary>
    [Route("storage/api/v1/instances")]
    [ApiController]
    public class InstancesController : Controller
    {
        private readonly IInstanceRepository _instanceRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly BridgeSettings bridgeSettings;
        private readonly ILogger logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="applicationRepository">the application repository handler</param>
        /// <param name="bridgeSettings">the bridge settings to do lookup of instance owner</param>
        /// <param name="logger">the logger</param>
        public InstancesController(
            IInstanceRepository instanceRepository,
            IApplicationRepository applicationRepository,
            IOptions<BridgeSettings> bridgeSettings,
            ILogger<InstancesController> logger)
        {
            _instanceRepository = instanceRepository;
            _applicationRepository = applicationRepository;
            this.bridgeSettings = bridgeSettings.Value;
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
        /// <returns>list of all instances for given instanceowner</returns>
        /// <!-- GET /instances?org=tdd or GET /instances?appId=tdd/app2 -->
        [HttpGet]
        public async Task<ActionResult> GetMany(string org, string appId)
        {
            if (!string.IsNullOrEmpty(org))
            {
                List<Instance> result = await _instanceRepository.GetInstancesOfOrg(org);
                if (result == null || result.Count == 0)
                {
                    return NotFound($"Did not find any instances for application owner (org)={org}");
                }

                return Ok(result);
            }
            else if (!string.IsNullOrEmpty(appId))
            {                
                List<Instance> result = await _instanceRepository.GetInstancesOfApplication(appId);
                if (result == null || result.Count == 0)
                {
                    return NotFound($"Did not find any instances for applicationId={appId}");
                }

                return Ok(result);
            }

            return BadRequest("Unable to perform query");
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
            // check if metadata exists
            Application appInfo = GetApplicationOrError(appId, out ActionResult appInfoErrorResult);
            if (appInfoErrorResult != null)
            {
                return appInfoErrorResult;
            }

            // get instanceOwnerId 
            int ownerId = GetOrLookupInstanceOwnerId(instanceOwnerId, instanceTemplate, out ActionResult instanceOwnerErrorResult);
            if (instanceOwnerErrorResult != null)
            {
                return instanceOwnerErrorResult;
            }            
         
            if (instanceTemplate == null)
            {
                instanceTemplate = new Instance();
            }           

            DateTime creationTime = DateTime.UtcNow;

            string org = appInfo.Org;

            Instance createdInstance = new Instance()
            {
                InstanceOwnerId = ownerId.ToString(),
                CreatedBy = User.Identity.Name,
                CreatedDateTime = creationTime,
                LastChangedBy = User.Identity.Name,
                LastChangedDateTime = creationTime,
                AppId = appId,
                Org = org,

                VisibleDateTime = instanceTemplate.VisibleDateTime,
                DueDateTime = instanceTemplate.DueDateTime,
                Labels = instanceTemplate.Labels,
                PresentationField = instanceTemplate.PresentationField,

                Workflow = new WorkflowState { CurrentStep = "FormFilling", IsComplete = false },
                InstanceState = new InstanceState { IsArchived = false, IsDeleted = false, IsMarkedForHardDelete = false },                
            };

            try
            {
                Instance result = await _instanceRepository.Create(createdInstance);
                return Ok(result);
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to create {appId} instance for {ownerId} due to {e}");
                return StatusCode(500, $"Unable to create {appId} instance for {ownerId} due to {e}");
            }
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

        /// <summary>
        /// InstanceOwner can be given in three different ways:
        ///  - instanceOwnerId is provided as query param (priority1),
        ///  - in instanceTemplate.instanceOwnerId (priority2),
        ///  - or instanceTemplate.instanceOwnerLookup (priority3)
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <param name="instanceTemplate">the instance template</param>
        /// <param name="errorResult">the errorResult. null if successful otherwise an action result</param>
        /// <returns></returns>
        private int GetOrLookupInstanceOwnerId(int? instanceOwnerId, Instance instanceTemplate, out ActionResult errorResult)
        {
            errorResult = null;
            int ownerId = instanceOwnerId ?? 0;           

            if (ownerId == 0)
            {
                if (instanceTemplate == null)
                {
                    errorResult = BadRequest("InstanceOwnerId must be set, either in query param or attached in instance object");
                }
                else
                {
                    if (instanceTemplate.InstanceOwnerId == null)
                    {
                        if (instanceTemplate.InstanceOwnerLookup == null)
                        {
                            errorResult = BadRequest("InstanceOwnerLookup cannot have null value. Cannot resolve instance owner id");
                        }
                        else
                        {
                            string instanceOwnerLookup = InstanceOwnerLookup(instanceTemplate.InstanceOwnerLookup).Result;
                            if (instanceOwnerLookup == null)
                            {
                                errorResult = BadRequest("Instance owner lookup failed.");
                            }
                            else
                            {
                                ownerId = int.Parse(instanceOwnerLookup);
                            }                            
                        }
                    }
                    else
                    {
                        ownerId = int.Parse(instanceTemplate.InstanceOwnerId);
                    }
                }
            }

            return ownerId;
        }

        private async Task<string> InstanceOwnerLookup(InstanceOwnerLookup lookup)
        {             
            string id;

            if (!string.IsNullOrEmpty(lookup.PersonNumber))
            {
                id = lookup.PersonNumber;
            }
            else if (!string.IsNullOrEmpty(lookup.organisationNumber))
            {
                id = lookup.organisationNumber;
            }
            else
            {
                throw new ArgumentException("Instance owner lookup must have either PersonNumber or OrganisationNumber set.");
            }

            try
            {
                Uri bridgeUrl = new Uri($"{bridgeSettings.GetApiBaseUrl()}parties/lookup");

                using (HttpClient client = new HttpClient())
                {
                    string idAsJson = JsonConvert.SerializeObject(id);

                    HttpResponseMessage response = await client.PostAsync(
                        bridgeUrl,
                        new StringContent(idAsJson, Encoding.UTF8, "application/json"));

                    if (response.StatusCode == HttpStatusCode.OK)
                    {
                        string partyIdString = await response.Content.ReadAsStringAsync();

                        return JsonConvert.DeserializeObject<string>(partyIdString);
                    }                    
                }
            }
            catch (Exception e) 
            {
                logger.LogError($"Lookup of instance owner id failed! {e.Message}");
            }

            return null;
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
            existingInstance.Workflow = instance.Workflow;
            existingInstance.InstanceState = instance.InstanceState;

            existingInstance.PresentationField = instance.PresentationField;
            existingInstance.DueDateTime = instance.DueDateTime;
            existingInstance.VisibleDateTime = instance.VisibleDateTime;
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
    }
}
