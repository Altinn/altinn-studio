using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using Serilog.Core;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860
namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// a summary is needed here
    /// </summary>
    [Route("storage/api/v1/[controller]")]
    public class InstancesController : Controller
    {
        private readonly IInstanceRepository _instanceRepository;
        private Logger logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

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
        /// <param name="applicationId">application id</param>
        /// <returns>list of all instances for given instanceowner</returns>
        /// GET /instances
        [HttpGet]
        public async Task<ActionResult> GetMany(int instanceOwnerId, string applicationOwnerId, string applicationId)
        {
            if (instanceOwnerId != 0)
            {
                var result = await _instanceRepository.GetInstancesOfInstanceOwnerAsync(instanceOwnerId);
                if (result == null || result.Count == 0)
                {
                    return NotFound($"Did not find any instances for instanceOwnerId={instanceOwnerId}");
                }

                return Ok(result);
            }
            else if (!string.IsNullOrEmpty(applicationOwnerId))
            {       
                var result = await _instanceRepository.GetInstancesOfApplicationOwnerAsync(applicationOwnerId);
                if (result == null || result.Count == 0)
                {
                    return NotFound($"Did not find any instances for applicationOwnerId={applicationOwnerId}");
                }

                return Ok(result);
            }
            else if (!string.IsNullOrEmpty(applicationId))
            {                
                var result = await _instanceRepository.GetInstancesOfApplicationAsync(applicationId);
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

            var result = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (result == null)
            {
                return NotFound("Did not find an instance with instanceId=" + instanceId);
            }

            watch.Stop();
            logger.Information("get {instanceid} for {instanceOwner} took {time}ms.", instanceId, instanceOwnerId, watch.ElapsedMilliseconds);

            return Ok(result);
        }

        /// <summary>
        /// Inserts new instance into the instance collection
        /// </summary>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="applicationId">the applicationid</param>
        /// <returns>instance object</returns>
        /// POST /instances?applicationId={applicationId}&instanceOwnerId={instanceOwnerId}"
        [HttpPost]        
        public async Task<ActionResult> Post(int instanceOwnerId, string applicationId)
        {
            if (string.IsNullOrEmpty(applicationId) || instanceOwnerId == 0)
            {
                return BadRequest("Missing parameter values: applicationId and instanceOwnerId must be set");
            }

            DateTime creationTime = DateTime.UtcNow;

            string applicationOwnerId = GetApplicationOwner(applicationId);

            Instance instance = new Instance()
            {
                InstanceOwnerId = instanceOwnerId.ToString(),
                CreatedBy = 0,
                CreatedDateTime = creationTime,
                LastChangedBy = 0,
                LastChangedDateTime = creationTime,
                ApplicationId = applicationId,
                ApplicationOwnerId = applicationOwnerId,
            };

            string result = await _instanceRepository.InsertInstanceIntoCollectionAsync(instance);            
            if (result == null)
            {
                return BadRequest("Unable to write new instance to database");
            }

            return Ok(result);
        }

        private string GetApplicationOwner(string applicationId)
        {
            string[] parts = applicationId.Split("/");

            if (parts.Length > 1)
            {
                return parts[0];
            }
            else
            {
                return "TEST";
            }            
        }

        /// <summary>
        /// Updates an instance
        /// </summary>
        /// <param name="instanceId">instance id</param>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="instance">instance</param>
        /// <returns></returns>
        /// PUT /instances/instanceid
        [HttpPut("{instanceId}")]
        public async Task<ActionResult> Put(Guid instanceId, int instanceOwnerId, [FromBody] Instance instance)
        {
            instance.LastChangedBy = instanceOwnerId;
            instance.LastChangedDateTime = DateTime.UtcNow;
            var result = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);
            if (result == null)
            {
                return BadRequest($"Couldn't update instanceId={instanceId}. Repository save failed");
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
                    instance.LastChangedBy = instanceOwnerId;
                    instance.LastChangedDateTime = DateTime.UtcNow;

                    var result = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);
                    if (result == null)
                    {
                        return Ok(result);
                    }                            
                }

                return BadRequest();
            }
        }
    }
}
