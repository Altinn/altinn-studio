using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860
namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// a summary is needed here
    /// </summary>
    [Route("api/v1/[controller]")]
    public class InstancesController : Controller
    {
        private readonly IInstanceRepository _instanceRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        public InstancesController(IInstanceRepository instanceRepository)
        {
            _instanceRepository = instanceRepository;
        }

        /// <summary>
        /// Get all instances for a given instanceowner
        /// </summary>
        /// <param name="instanceOwnerId">owner of the instances</param>
        /// <param name="applicationOwnerId">application owner</param>
        /// <returns>list of all instances for given instanceowner</returns>
        /// GET api/v1/instances
        [HttpGet("query")]
        public async Task<ActionResult> Get(int instanceOwnerId, string applicationOwnerId)
        {
            if (instanceOwnerId != 0)
            {
                var result = await _instanceRepository.GetInstancesOfInstanceOwnerAsync(instanceOwnerId);
                if (result == null)
                {
                    return NotFound();
                }

                return Ok(result);
            }
            else if (!string.IsNullOrEmpty(applicationOwnerId))
            {       
                var result = await _instanceRepository.GetInstancesOfApplicationOwnerAsync(applicationOwnerId);
                if (result == null)
                {
                    return NotFound();
                }

                return Ok(result);
            }

            return BadRequest();
        }        

        /// <summary>
        /// Gets an instance for a given instanceid
        /// </summary>
        /// <param name="instanceId">instance id</param>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <returns></returns>
        /// GET api/v1/instances/{instanceId}
        [HttpGet("{instanceId:guid}")]
        public async Task<ActionResult> Get(Guid instanceId, int instanceOwnerId)
        {
            var result = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        /// <summary>
        /// Inserts new instance into the instance collection
        /// </summary>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="applicationId">the applicationid</param>
        /// <returns>instance object</returns>
        /// POST api/v1/instances?applicationId={applicationId}&instanceOwnerId={instanceOwnerId}"
        [HttpPost]        
        public async Task<ActionResult> Post(int instanceOwnerId, string applicationId)
        {
            if (string.IsNullOrEmpty(applicationId) || instanceOwnerId == 0)
            {
                return BadRequest("Both applicationId and instanceownerid must be set");
            }

            DateTime creationTime = DateTime.UtcNow;

            Instance instance = new Instance()
            {
                InstanceOwnerId = instanceOwnerId.ToString(),
                CreatedBy = 0,
                CreatedDateTime = creationTime,
                LastChangedBy = 0,
                LastChangedDateTime = creationTime,
                ApplicationId = applicationId,
            };

            string result = await _instanceRepository.InsertInstanceIntoCollectionAsync(instance);            
            if (result == null)
            {
                return BadRequest();
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
        /// PUT api/v1/<controller>/5
        [HttpPut("{instanceId}")]
        public async Task<ActionResult> Put(Guid instanceId, int instanceOwnerId, [FromBody] Instance instance)
        {
            instance.LastChangedBy = instanceOwnerId;
            instance.LastChangedDateTime = DateTime.UtcNow;
            var result = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);
            if (result == null)
            {
                return BadRequest();
            }

            return Ok(result);
        }

        /// <summary>
        /// Delete an instance
        /// </summary>
        /// <param name="instanceId">instance id</param>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <returns>updated instance object</returns>
        /// DELETE api/v1/<controller>/5
        [HttpDelete("{instanceId}")]
        public async Task<ActionResult> Delete(Guid instanceId, int instanceOwnerId)
        {
            Instance instance = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);

            instance.IsDeleted = true;
            instance.LastChangedBy = instanceOwnerId;
            instance.LastChangedDateTime = DateTime.UtcNow;
            var result = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);
            if (result == null)
            {
                return BadRequest();
            }

            return Ok(result);
        }
    }
}
