using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.Controllers
{
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
        /// Get all instances for a given instanceowner
        /// </summary>
        /// <param name="instanceOwnerId">owner of the instances</param>
        /// <param name="applicationOwnerId">application owner</param>
        /// <param name="applicationId">application id</param>
        /// <returns>list of all instances for given instanceowner</returns>
        /// GET /instances
        [HttpGet]
        public async Task<ActionResult> GetMany(int instanceOwnerId, string applicationOwnerId, string applicationId)
        {
            if (instanceOwnerId != 0)
            {
                List<Instance> result = await _instanceRepository.GetInstancesOfInstanceOwnerAsync(instanceOwnerId);
                if (result == null || result.Count == 0)
                {
                    return NotFound($"Did not find any instances for instanceOwnerId={instanceOwnerId}");
                }

                return Ok(result);
            }
            else if (!string.IsNullOrEmpty(applicationOwnerId))
            {
                List<Instance> result = await _instanceRepository.GetInstancesOfApplicationOwnerAsync(applicationOwnerId);
                if (result == null || result.Count == 0)
                {
                    return NotFound($"Did not find any instances for applicationOwnerId={applicationOwnerId}");
                }

                return Ok(result);
            }
            else if (!string.IsNullOrEmpty(applicationId))
            {                
                List<Instance> result = await _instanceRepository.GetInstancesOfApplicationAsync(applicationId);
                if (result == null || result.Count == 0)
                {
                    return NotFound($"Did not find any instances for applicationId={applicationId}");
                }

                return Ok(result);
            }

            return BadRequest("Unable to perform query");
        }        

        /// <summary>
        /// Gets an instance for a given instanceid
        /// </summary>
        /// <param name="instanceId">instance id</param>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <returns></returns>
        /// GET /instances/{instanceId}
        [HttpGet("{instanceId:guid}")]
        public async Task<ActionResult> Get(Guid instanceId, int instanceOwnerId)
        {
            Stopwatch watch = Stopwatch.StartNew();

            Instance result = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (result == null)
            {
                return NotFound("Did not find an instance with instanceId=" + instanceId);
            }

            watch.Stop();
            logger.LogInformation("get {instanceid} for {instanceOwner} took {time}ms.", instanceId, instanceOwnerId, watch.ElapsedMilliseconds);

            return Ok(result);
        }

        /// <summary>
        /// Inserts new instance into the instance collection
        /// </summary>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="applicationId">the applicationid</param>
        /// <returns>instance object</returns>
        /// <!-- POST /instances?applicationId={applicationId}&instanceOwnerId={instanceOwnerId} -->
        [HttpPost]        
        public async Task<ActionResult> Post(int instanceOwnerId, string applicationId)
        {
            if (string.IsNullOrEmpty(applicationId) || instanceOwnerId == 0)
            {
                return BadRequest("Missing parameter values: applicationId and instanceOwnerId must be set");
            }

            // check if metadata exists
            ApplicationMetadata appInfo = GetApplicationInformation(applicationId);
            if (appInfo == null)
            {
                return Forbid($"Application Metadata is not registered for this applicationId: {applicationId}");
            }

            DateTime creationTime = DateTime.UtcNow;

            string applicationOwnerId = appInfo.ApplicationOwnerId;

            Instance instance = new Instance()
            {
                InstanceOwnerId = instanceOwnerId.ToString(),
                CreatedBy = User.Identity.Name,
                CreatedDateTime = creationTime,
                LastChangedBy = User.Identity.Name,
                LastChangedDateTime = creationTime,
                ApplicationId = applicationId,
                ApplicationOwnerId = applicationOwnerId,
                VisibleDateTime = creationTime,
            };
            
            string result = await _instanceRepository.InsertInstanceIntoCollectionAsync(instance);            
            if (result == null)
            {
                logger.LogError("Unable to write new instance to database");
                return BadRequest("Unable to write new instance to database");
            }

            return Ok(result);
        }

        /// <summary>
        /// Updates an instance
        /// </summary>
        /// <param name="instanceId">instance id</param>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="instance">instance</param>
        /// <returns></returns>        
        [HttpPut("{instanceId}")]
        public async Task<ActionResult> Put(Guid instanceId, int instanceOwnerId, [FromBody] Instance instance)
        {
            Instance result = null;

            instance.LastChangedBy = User.Identity.Name;
            instance.LastChangedDateTime = DateTime.UtcNow;

            /* TODO: make sure put doesn't update storage controlled fields */

            try
            {
                result = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);
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
        /// <param name="instanceId">instance id</param>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="hard">if true hard delete will take place</param>
        /// <returns>updated instance object</returns>
        /// DELETE /instances/{instanceId}?instanceOwnerId={instanceOwnerId}
        [HttpDelete("{instanceId}")]
        public async Task<ActionResult> Delete(Guid instanceId, int instanceOwnerId, bool? hard)
        {
            Instance instance = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (instance == null)
            {
                return NotFound($"Didn't find the object that should be deleted with instanceId={instanceId}");
            }
            else
            {
                if (hard.HasValue && hard == true)
                {
                    bool deletedOK = await _instanceRepository.DeleteInstance(instance);
                    if (deletedOK)
                    {
                        return Ok(true);
                    }                    
                }
                else
                {
                    instance.IsDeleted = true;
                    instance.LastChangedBy = User.Identity.Name;
                    instance.LastChangedDateTime = DateTime.UtcNow;

                    Instance result = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);
                    if (result == null)
                    {
                        return Ok(result);
                    }                            
                }

                return BadRequest();
            }
        }

        private ApplicationMetadata GetApplicationInformation(string applicationId)
        {
            string applicationOwnerId = applicationId.Split("-")[0];
            try
            {
                ApplicationMetadata application = _applicationRepository.FindOne(applicationId, applicationOwnerId).Result;

                return application;
            }
            catch (Exception e)
            {
                logger.LogError($"Get application {applicationId} failed: {e.Message}");
            }

            return null;
        }
    }
}
