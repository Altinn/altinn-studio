using System;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.RestControllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Storage.Interface.Clients;

namespace AltinnCore.Runtime
{
    /// <summary>
    /// Handles and dispatches operations to platform storage for the application instance resources
    /// </summary>
    [Route("{org}/{app}/instances")]
    [Authorize]
    [ApiController]
    public class InstancesController : ControllerBase
    {
        private readonly ILogger<InstancesController> logger;
        private readonly HttpClient storageClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        public InstancesController(
            ILogger<InstancesController> logger,
            IHttpClientAccessor httpClientAccessor)
        {
            this.logger = logger;
            this.storageClient = httpClientAccessor.StorageClient;
        }

        /// <summary>
        ///  Gets one application instance from platform storage.
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id (partyId)</param>
        /// <param name="instanceGuid">the instance guid</param>
        /// <returns>the instance</returns>
        [HttpGet("{instanceOwnerId:int}/{instanceGuid:guid}")]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]        
        public async Task<ActionResult> Get(int instanceOwnerId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";
            Uri storageUrl = new Uri($"instances/{instanceId}", UriKind.Relative);

            HttpResponseMessage httpResponse = await storageClient.GetAsync(storageUrl);
            if (httpResponse.IsSuccessStatusCode)
            {
                string jsonContent = await httpResponse.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(jsonContent);
                GetAndSetAppSelfLink(instance);

                return Ok(instance);
            }

            return StatusCode((int)httpResponse.StatusCode, httpResponse.ReasonPhrase);
        }

        /// <summary>
        ///  Updates an application instance in platform storage.
        /// </summary>
        /// <param name="org">the organisation id, the owner of the app</param>
        /// <param name="app">the app name</param>
        /// <param name="instanceOwnerId">the instance owner id (partyId)</param>
        /// <param name="instanceGuid">the instance guid</param>
        /// <param name="instance">the instance with attributes that should be updated</param>
        /// <returns>the updated instance</returns>
        [HttpPut("{instanceOwnerId:int}/{instanceGuid:guid}")]
        [Produces("application/json")]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> Put(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromBody] Instance instance)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";
            Uri storageUrl = new Uri($"instances/{instanceId}", UriKind.Relative);

            HttpResponseMessage httpResponse = await storageClient.PutAsync(storageUrl, instance.AsJson());
            if (httpResponse.IsSuccessStatusCode)
            {
                string jsonContent = await httpResponse.Content.ReadAsStringAsync();
                Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(jsonContent);
                GetAndSetAppSelfLink(updatedInstance);

                return Ok(updatedInstance);
            }

            return StatusCode((int)httpResponse.StatusCode, httpResponse.ReasonPhrase);
        }

        /// <summary>
        /// Creates a new instance of an application in platform storage. Clients can send a instance as a json or send a
        /// multipart form-data with the instance in the first part named "instance" and the prefill data in the next parts, with
        /// names that corresponds to the element types defined in the application metadata.
        /// The content is dispatched to storage. Currently calculate and validate is not implemented. 
        /// 
        /// </summary>
        /// <param name="org">the organisation id</param>
        /// <param name="app">the application name</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <returns>the created instance</returns>
        [HttpPost]
        [DisableFormValueModelBinding]
        [Consumes("application/json", otherContentTypes: new string[] { "multipart/form-data", })]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public ActionResult<Instance> Post([FromRoute] string org, [FromRoute] string app, [FromQuery] int? instanceOwnerId)
        {
            if (string.IsNullOrEmpty(org))
            {
                return BadRequest("The path parameter 'org' cannot be empty");
            }

            if (string.IsNullOrEmpty(app))
            {
                return BadRequest("The path parameter 'app' cannot be empty");
            }

            string appId = $"{org}/{app}";

            Uri storageUri = GetStorageUri(appId, instanceOwnerId);

            // dispatch request to platform storage
            Instance instance = DispatchCreateInstanceToStorage(storageUri, Request, out ActionResult dispatchError);
            if (dispatchError != null)
            {
                return dispatchError;
            }

            if (instance.Data != null)
            {
                instance = CalculateAndValidate(instance, out ActionResult calculateOrValidateError);
                if (calculateOrValidateError != null)
                {
                    return calculateOrValidateError;
                }
            }            

            if (instance != null)
            {
                return Created(GetAndSetAppSelfLink(instance), instance);
            }

            return StatusCode(500, "Unknown error!");
        }

        private string GetAndSetAppSelfLink(Instance instance)
        {
            string host = $"{Request.Scheme}://{Request.Host.ToUriComponent()}";
            string url = Request.Path;

            string appSelfLink = $"{host}{url}/{instance.Id}";

            instance.SelfLinks = instance.SelfLinks ?? new Storage.Interface.Models.ResourceLinks();
            instance.SelfLinks.Apps = appSelfLink;

            return appSelfLink;
        }

        private Instance CalculateAndValidate(Instance instance, out ActionResult calculateOrValidateError)
        {
            Instance changedInstance = instance;
            calculateOrValidateError = null;

            foreach (DataElement dataElement in instance.Data)
            {
                logger.LogInformation($"Calculate and validate: {dataElement.ElementType}");

                Uri dataUri = new Uri($"instances/{instance.Id}/data/{dataElement.Id}", UriKind.Relative);

                // Get data element
                // Todo - Calulate and Validate
                logger.LogInformation($"calculate: {dataUri}");

                bool validationOk = true;
                if (validationOk)
                {
                    // update data object if changed by calculation - dispatch to storage, set lastChangedInstance
                }
                else
                {
                    // Todo delete instance in storage
                    calculateOrValidateError = Conflict("Data element is not valid!");
                }
            }
            
            return changedInstance;
        }

        private Uri GetStorageUri(string appId, int? instanceOwnerId)
        {            
            if (instanceOwnerId.HasValue)
            {
                return new Uri($"instances?appId={appId}&instanceOwnerId={instanceOwnerId.Value}", UriKind.Relative);
            }
            else
            {
                return new Uri($"instances?appId={appId}", UriKind.Relative);
            }
        }

        private Instance DispatchCreateInstanceToStorage(Uri storageUri, HttpRequest request, out ActionResult dispatchError)
        {
            dispatchError = null;
            StreamContent content = new StreamContent(request.Body);
            if (!string.IsNullOrEmpty(request.ContentType))
            {
                content.Headers.Add("Content-Type", request.ContentType);
            }

            HttpResponseMessage httpResponse = storageClient.PostAsync(storageUri, content).Result;

            if (httpResponse.IsSuccessStatusCode)
            {
                Instance instance = JsonConvert.DeserializeObject<Instance>(httpResponse.Content.ReadAsStringAsync().Result);
                return instance;
            }

            dispatchError = StatusCode((int)httpResponse.StatusCode, httpResponse.ReasonPhrase);

            return null;
        }        
    }
}
