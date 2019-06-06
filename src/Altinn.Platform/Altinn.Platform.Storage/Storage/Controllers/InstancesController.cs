namespace Altinn.Platform.Storage.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Models;
    using Altinn.Platform.Storage.Repository;
    using global::Storage.Interface.Models;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Azure.Documents;
    using Microsoft.Extensions.Logging;

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
        public async Task<ActionResult> Post(string appId, int instanceOwnerId, [FromBody] Instance instanceTemplate)
        {
            if (instanceTemplate == null && instanceOwnerId == 0)
            {
                return BadRequest("Missing parameter values: instanceOwnerId must be set");
            }
            else if (instanceOwnerId == 0 && (instanceTemplate != null && string.IsNullOrEmpty(instanceTemplate.InstanceOwnerId))) 
            {
                return BadRequest("Missing parameter values: instanceOwnerId must be set");
            }

            if (instanceOwnerId == 0 && instanceTemplate != null)
            {
                instanceOwnerId = int.Parse(instanceTemplate.InstanceOwnerId);
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
                InstanceOwnerId = instanceOwnerId.ToString(),
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

                Workflow = new WorkflowState { CurrentStep = "FormFilling", IsComplete = false }
            };

            try
            {
                Instance result = await _instanceRepository.Create(createdInstance);
                return Ok(result);
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to create {appId} instance for {instanceOwnerId} due to {e}");
                return StatusCode(500, $"Unable to create {appId} instance for {instanceOwnerId} due to {e}");
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
            existingInstance.Workflow = instance.Workflow;
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

        private Application GetApplicationInformation(string appId)
        {
            string org = appId.Split("/")[0];

            Application application = _applicationRepository.FindOne(appId, org).Result;

            return application;
        }
    }
}
