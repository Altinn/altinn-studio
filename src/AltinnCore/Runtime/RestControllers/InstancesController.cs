using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.ModelBinding;
using AltinnCore.Runtime.RestControllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Runtime
{
    /// <summary>
    /// Handles and dispatches operations to platform storage for the application instance resources
    /// </summary>
    [Route("{org}/{app}/instances")]
    [ApiController]
    public class InstancesController : ControllerBase
    {
        private readonly IAuthorization authorization;
        private readonly ILogger<InstancesController> logger;
        private readonly PlatformSettings platformSettings;
        private readonly HttpClient storageClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        public InstancesController(
            IAuthorization authorizationService,
            ILogger<InstancesController> logger,
            IOptions<PlatformSettings> platformSettings,
            IHttpClientAccessor httpClientAccessor)
        {
            this.authorization = authorizationService;
            this.logger = logger;
            this.platformSettings = platformSettings.Value;
            this.storageClient = httpClientAccessor.StorageClient;
        }

        /// <summary>
        ///  Gets one application instance from platform storage.
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id (partyId)</param>
        /// <param name="instanceGuid">the instance guid</param>
        /// <returns></returns>
        [HttpGet("{instanceOwnerId:int}/{instanceGuid:guid}")]
        [Authorize]
        public async Task<ActionResult> Get(int instanceOwnerId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";
            Uri storageUrl = new Uri($"instances/{instanceId}");

            HttpResponseMessage httpResponse = await storageClient.GetAsync(storageUrl);
            if (httpResponse.IsSuccessStatusCode)
            {
                return Ok(httpResponse.Content);
            }

            return StatusCode((int)httpResponse.StatusCode, httpResponse.ReasonPhrase);
        }

        /// <summary>
        /// creates a new instance of an application in platform storage.
        ///   1) dispatch to storage
        ///   2) get data and do calculate and validate
        ///   3) if error delete instance/data
        ///   4) return instance ok
        /// 
        /// </summary>
        /// <param name="org">the organisation id</param>
        /// <param name="app">the application name</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        [HttpPost]

       // [Authorize]
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
                return Created(GetAppSelfLink(instance), instance);
            }

            return StatusCode(500, "Unknown error!");
        }

        private string GetAppSelfLink(Instance instance)
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
                // Todo - Calulate
                // Todo - Validate
                bool validationOk = true;
                if (validationOk)
                {
                    // update data object if changed by calculation - dispatch to storage
                    // Todo - set lastChangedInstance
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
            content.Headers.Add("Content-Type", request.ContentType);
           
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
