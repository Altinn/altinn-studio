using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.RestControllers;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Common.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Storage.Interface.Models;

namespace AltinnCore.Runtime.RestControllers
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
        private readonly GeneralSettings generalSettings;
        private readonly HttpClient storageClient;
        private readonly IInstance instanceService;        
        private readonly IData dataService;

        private readonly IExecution executionService;
        private readonly UserHelper userHelper;
        private readonly IRegister registerService;
        private readonly IRepository repositoryService;
        private readonly IPlatformServices platformService;
        private readonly IInstanceEvent eventService;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        public InstancesController(
            IOptions<GeneralSettings> generalSettings,
            ILogger<InstancesController> logger,
            IRegister registerService,            
            IInstance instanceService,
            IData dataService,
            IExecution executionService,
            IProfile profileService,
            IPlatformServices platformServices,
            IInstanceEvent eventService,
            IRepository repositoryService)
        {
            this.generalSettings = generalSettings.Value;
            this.logger = logger;
            this.instanceService = instanceService;
            this.dataService = dataService;
            this.executionService = executionService;
            this.registerService = registerService;
            this.platformService = platformServices;
            this.eventService = eventService;
            this.repositoryService = repositoryService;

            userHelper = new UserHelper(profileService, registerService, generalSettings);
        }

        /// <summary>
        ///  Gets one application instance from platform storage.
        /// </summary>
        /// <param name="org">the org</param>
        /// <param name="app">the app name</param>
        /// <param name="instanceOwnerId">the instance owner id (partyId)</param>
        /// <param name="instanceGuid">the instance guid</param>
        /// <returns>the instance</returns>
        [HttpGet("{instanceOwnerId:int}/{instanceGuid:guid}")]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> Get(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound();
            }

            SetAppSelfLinks(instance, Request);

            return Ok(instance);
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
            Instance updatedInstance = await instanceService.UpdateInstance(instance, app, org, instanceOwnerId, instanceGuid);

            if (instance == null)
            {
                return NotFound();
            }

            SetAppSelfLinks(instance, Request);

            return Ok(instance);
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
        public async Task<ActionResult<Instance>> Post([FromRoute] string org, [FromRoute] string app, [FromQuery] int? instanceOwnerId)
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

            // If this is a multipart request we assume the creation is by application owner or client system.
            if (Request.ContentType != null && Request.ContentType.StartsWith("multipart"))
            {
                instanceOwnerId = 2000004;

                // 1) TODO handle multipart and instanceTemplate
            }

            if (!instanceOwnerId.HasValue)
            {
                return BadRequest("Instance owner id must currently have a value");
            }

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerId = instanceOwnerId.Value.ToString(),
            };

            Instance instance = await instanceService.CreateInstance(org, app, instanceTemplate);           
            
            if (instance == null)
            {
                return StatusCode(500, "Unknown error!");                
            }

            SetAppSelfLinks(instance, Request);
            string url = instance.SelfLinks.Apps;

            DispatchEvent("created", instance);

            return Created(url, instance);
        }

        /// <summary>
        /// Sets the application specific self links.
        /// </summary>
        /// <param name="instance">the instance to set links for</param>
        /// <param name="request">the http request to extract host and path name</param>
        internal static void SetAppSelfLinks(Instance instance, HttpRequest request)
        {
            string host = $"https://{request.Host.ToUriComponent()}";
            string url = request.Path;

            string appSelfLink = $"{host}{url}";

            instance.SelfLinks = instance.SelfLinks ?? new Storage.Interface.Models.ResourceLinks();
            instance.SelfLinks.Apps = appSelfLink;

            if (instance.Data != null)
            {
                foreach (DataElement dataElement in instance.Data)
                {
                    dataElement.DataLinks = dataElement.DataLinks ?? new ResourceLinks();

                    dataElement.DataLinks.Apps = $"{appSelfLink}/data/{dataElement.Id}";
                }
            }
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

        /// <summary>
        /// Event generator.
        /// </summary>
        private async void DispatchEvent(string eventType, Instance instance)
        {
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await userHelper.GetUserContext(HttpContext);

            int authenticationLevel = requestContext.UserContext.AuthenticationLevel;
            int userId = requestContext.UserContext.UserId;

            // Create and store the instance created event
            InstanceEvent instanceEvent = new InstanceEvent
            {
                AuthenticationLevel = authenticationLevel,
                EventType = eventType,
                InstanceId = instance.Id,
                InstanceOwnerId = instance.InstanceOwnerId,
                UserId = userId,
                WorkflowStep = instance.Process != null ? instance.Process.CurrentTask : null,
            };

            await eventService.SaveInstanceEvent(instanceEvent, instance.Org, instance.AppId.Split("/")[1]);
        }
    }

}
