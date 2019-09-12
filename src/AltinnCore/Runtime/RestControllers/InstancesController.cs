using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Common.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Storage.Interface.Models;

namespace AltinnCore.Runtime.RestControllers
{
    /// <summary>
    /// Controller for application instances for app-backend.
    /// You can create a new instance (POST), update it (PUT) and retreive a specific instance (GET).
    /// </summary>
    [Route("{org}/{app}/instances")]
    [Authorize]
    [ApiController]
    public class InstancesController : ControllerBase
    {
        private readonly ILogger<InstancesController> logger;
        private readonly GeneralSettings generalSettings;
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
            IPlatformServices platformService,
            IInstanceEvent eventService,
            IRepository repositoryService)
        {
            this.generalSettings = generalSettings.Value;
            this.logger = logger;
            this.instanceService = instanceService;
            this.dataService = dataService;
            this.executionService = executionService;
            this.registerService = registerService;
            this.platformService = platformService;
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
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid)
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
        public async Task<ActionResult<Instance>> Post(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] int? instanceOwnerId)
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

            Application application = repositoryService.GetApplication(org, app);
            if (application == null)
            {
                return NotFound($"AppId {org}/{app} was not found");
            }

            // If this is a multipart request we assume the creation is by application owner or client system.
            if (Request.ContentType != null && Request.ContentType.StartsWith("multipart"))
            {
                if (!instanceOwnerId.HasValue)
                {
                    return BadRequest("Multipart is currently not supported");
                }

                // 1) TODO handle multipart and instanceTemplate
            }

            if (!instanceOwnerId.HasValue)
            {
                return BadRequest("InstanceOwnerId must currently have a value");
            }

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerId = instanceOwnerId.Value.ToString(),
            };

            Party party = await registerService.GetParty(instanceOwnerId.Value);

            if (!InstantiationHelper.IsPartyAllowedToInstantiate(party, application.PartyTypesAllowed))
            {
                return Forbid($"Party {party.PartyId} is not allowed to instantiate this application {org}/{app}");
            }

            Instance instance = await instanceService.CreateInstance(org, app, instanceTemplate);           
            
            if (instance == null)
            {
                return StatusCode(500, "Unknown error!");                
            }

            SetAppSelfLinks(instance, Request);
            string url = instance.SelfLinks.Apps;

            DispatchEvent(InstanceEventType.Created.ToString(), instance);

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

            if (!appSelfLink.EndsWith(instance.Id))
            {
                appSelfLink += instance.Id;
            }

            instance.SelfLinks = instance.SelfLinks ?? new ResourceLinks();
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

        /// <summary>
        /// Creates an event and dispatches it to the eventService for storage.
        /// </summary>
        private async void DispatchEvent(string eventType, Instance instance)
        {
            UserContext userContext = await userHelper.GetUserContext(HttpContext);

            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int authenticationLevel = userContext.AuthenticationLevel;
            int userId = userContext.UserId;

            // Create and store the instance created event
            InstanceEvent instanceEvent = new InstanceEvent
            {
                AuthenticationLevel = authenticationLevel,
                EventType = eventType,
                InstanceId = instance.Id,
                InstanceOwnerId = instance.InstanceOwnerId,
                UserId = userId,
                WorkflowStep = instance.Process?.CurrentTask,
            };

            await eventService.SaveInstanceEvent(instanceEvent, instance.Org, app);
        }
    }
}
