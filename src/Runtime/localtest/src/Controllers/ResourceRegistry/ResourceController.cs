using Altinn.ResourceRegistry.Core;
using Altinn.ResourceRegistry.Core.Extensions;
using Altinn.ResourceRegistry.Core.Models;
using Altinn.ResourceRegistry.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace ResourceRegistry.Controllers
{
    /// <summary>
    /// Controller responsible for all operations for managing resources in the resource registry
    /// </summary>
    [Route("resourceregistry/api/v1/resource")]
    [ApiController]
    public class ResourceController : ControllerBase
    {
        private IResourceRegistry _resourceRegistry;
        private readonly IObjectModelValidator _objectModelValidator;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<ResourceController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ResourceController"/> controller.
        /// </summary>
        /// <param name="resourceRegistry">Service implementation for operations on resources in the resource registry</param>
        /// <param name="objectModelValidator">Object model validator</param>
        /// <param name="httpContextAccessor">Http context accessor</param>
        /// <param name="logger">Logger</param>
        public ResourceController(IResourceRegistry resourceRegistry, IObjectModelValidator objectModelValidator, IHttpContextAccessor httpContextAccessor, ILogger<ResourceController> logger)
        {
            _resourceRegistry = resourceRegistry;
            _objectModelValidator = objectModelValidator;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        /// <summary>
        /// Gets a single resource by its resource identifier if it exists in the resource registry
        /// </summary>
        /// <param name="id">The resource identifier to retrieve</param>
        /// <returns>ServiceResource</returns>
        [HttpGet("{id}")]
        [Produces("application/json")]
        public async Task<ServiceResource> Get(string id)
        {
            return await _resourceRegistry.GetResource(id);
        }

        /// <summary>
        /// Creates a service resource in the resource registry if it pass all validation checks
        /// </summary>
        /// <param name="serviceResource">Service resource model to create in the resource registry</param>
        /// <returns>ActionResult describing the result of the operation</returns>
        [SuppressModelStateInvalidFilter]
        [HttpPost]
        [Produces("application/json")]
        [Consumes("application/json")]
        public async Task<ActionResult> Post([ValidateNever] ServiceResource serviceResource)
        {
            if (serviceResource.IsComplete.HasValue && serviceResource.IsComplete.Value)
            {
                if (!ModelState.IsValid)
                {
                    return ValidationProblem(ModelState);
                }
            }

            try
            {
                serviceResource.Identifier.AsFilePath();
            }
            catch
            {
                return BadRequest($"Invalid resource identifier. Cannot be empty or contain any of the characters: {string.Join(", ", Path.GetInvalidFileNameChars())}");
            }

            await _resourceRegistry.CreateResource(serviceResource);

            return Created("/ResourceRegistry/api/" + serviceResource.Identifier, null);
        }

        /// <summary>
        /// Updates a service resource in the resource registry if it pass all validation checks
        /// </summary>
        /// <param name="id">Resource ID</param>
        /// <param name="serviceResource">Service resource model for update in the resource registry</param>
        /// <returns>ActionResult describing the result of the operation</returns>
        [SuppressModelStateInvalidFilter]
        [HttpPut("{id}")]
        [Produces("application/json")]
        [Consumes("application/json")]
        public async Task<ActionResult> Put(string id, ServiceResource serviceResource)
        {
            ServiceResource currentResource = await _resourceRegistry.GetResource(id);

            if (currentResource == null)
            {
                return BadRequest();
            }

            if (id != serviceResource.Identifier)
            {
                return BadRequest();
            }

            if (serviceResource.IsComplete.HasValue && serviceResource.IsComplete.Value)
            {
                if (!ModelState.IsValid)
                {
                    return ValidationProblem(ModelState);
                }
            }

            await _resourceRegistry.UpdateResource(serviceResource);

            return Ok();
        }

        /// <summary>
        /// Returns the XACML policy for a resource in resource registry.
        /// </summary>
        /// <param name="id">Resource Id</param>
        /// <returns></returns>
        [HttpGet("{id}/policy")]
        public async Task<ActionResult> GetPolicy(string id)
        {
            ServiceResource resource = await _resourceRegistry.GetResource(id);
            if (resource == null)
            {
                return NotFound("Unable to find resource");
            }

            Stream dataStream = await _resourceRegistry.GetPolicy(resource);

            if (dataStream == null)
            {
                return NotFound("Unable to find requested policy");
            }

            return File(dataStream, "text/xml", "policy.xml");
        }

        /// <summary>
        /// Creates or overwrites the existing XACML policy for the resource, if it pass all validation checks.
        /// The XACML policy must define at least a subject and resource, and will be used to restrict access for the resource.
        /// </summary>
        /// <param name="id">The resource identifier to store the policy for</param>
        /// <param name="policyFile">The XACML policy file</param>
        /// <returns>ActionResult describing the result of the operation</returns>
        [HttpPost("{id}/policy")]
        [HttpPut("{id}/policy")]
        public async Task<ActionResult> WritePolicy(string id, IFormFile policyFile)
        {
            if (policyFile == null)
            {
                return BadRequest("The policy file can not be null");
            }

            Stream fileStream = policyFile.OpenReadStream();
            if (fileStream == null)
            {
                return BadRequest("The file stream can not be null");
            }

            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest("Unknown resource");
            }

            ServiceResource resource = await _resourceRegistry.GetResource(id);
            if (resource == null)
            {
                return BadRequest("Unknown resource");
            }

            try
            {
                bool successfullyStored = await _resourceRegistry.StorePolicy(resource, fileStream);
               
                if (successfullyStored)
                {
                    return Created(id + "/policy", null);
                }
            }
            catch (ArgumentException ex)
            {
                _logger.LogError(ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.ToString());
                return StatusCode(500);
            }

            return BadRequest("Something went wrong in the upload of file to storage");
        }

        /// <summary>
        /// Deletes a resource from the resource registry
        /// </summary>
        /// <param name="id">The resource identifier to delete</param>
        [HttpDelete("{id}")]
        [Produces("application/json")]
        public async void Delete(string id)
        {
            await _resourceRegistry.Delete(id);
        }

        /// <summary>
        /// Allows for searching for resources in the resource registry
        /// </summary>
        /// <param name="search">The search model defining the search filter criterias</param>
        /// <returns>A list of service resources found to match the search criterias</returns>
        [HttpGet("Search")]
        [Produces("application/json")]
        public async Task<List<ServiceResource>> Search([FromQuery] ResourceSearch search)
        {
            return await _resourceRegistry.Search(search);
        }
     }

    /// <summary>
    /// ToDo: move to a separate class
    /// </summary>
    public class SuppressModelStateInvalidFilterAttribute : Attribute, IActionModelConvention
    {
        private const string FilterTypeName = "ModelStateInvalidFilterFactory";

        /// <inheritdoc/>
        public void Apply(ActionModel action)
        {
            for (var i = 0; i < action.Filters.Count; i++)
            {
                if (action.Filters[i].GetType().Name == FilterTypeName)
                {
                    action.Filters.RemoveAt(i);
                    break;
                }
            }
        }
    }
}
