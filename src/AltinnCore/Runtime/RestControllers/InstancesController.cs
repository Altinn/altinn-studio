using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.RequestHandling;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Common.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Storage.Interface.Enums;
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

            Application application = repositoryService.GetApplication(org, app);
            if (application == null)
            {
                return NotFound($"AppId {org}/{app} was not found");
            }

            MultipartRequestReader parsedRequest = new MultipartRequestReader(Request);
            parsedRequest.Read().Wait();

            if (parsedRequest.Errors.Any())
            {
                return BadRequest($"Error when reading content: {parsedRequest.Errors}");
            }

            Instance instanceTemplate = ExtractInstanceTemplate(parsedRequest, instanceOwnerId);
            if (instanceTemplate == null)
            {
                return BadRequest("Cannot create a valid instance template, you must provide an instanceOwnerId");
            }

            RequestPartValidator requestValidator = new RequestPartValidator(application);

            string multipartError = requestValidator.ValidateParts(parsedRequest.Parts);

            if (!string.IsNullOrEmpty(multipartError))
            {
                return BadRequest($"Error when comparting content to application metadata: {multipartError}");
            }            

            if (string.IsNullOrEmpty(instanceTemplate.InstanceOwnerId))
            {
                return BadRequest($"Error instanceOwnerId must have value");
            }

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

            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            int instanceOwnerInt = int.Parse(instance.InstanceOwnerId);
            Instance instanceWithData = null;

            try
            {
                foreach (RequestPart part in parsedRequest.Parts)
                {
                    object data = new StreamReader(part.Stream).ReadToEnd();
                    IServiceImplementation serviceImplementation = await PrepareServiceImplementation(org, app, part.Name, true);
                    instanceWithData = await dataService.InsertData(data, instanceGuid, serviceImplementation.GetServiceModelType(), org, app, instanceOwnerInt);

                    if (instanceWithData == null)
                    {
                        throw new ArgumentNullException("Dataservice did not return a valid instance metadata when attempt to store data element {part.Name}");
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError($"Failure storing multpart prefil of {instanceOwnerId}/{instanceGuid}. Because {ex}");

                // todo add compensating transaction
                return StatusCode(500, $"Failure storing multpart prefil of {instanceOwnerId}/{instanceGuid}. Because {ex.Message}");
            }

            if (instanceWithData != null)
            {
                instance = instanceWithData;
            }

            SetAppSelfLinks(instance, Request);
            string url = instance.SelfLinks.Apps;

            await DispatchEvent(InstanceEventType.Created.ToString(), instance);

            return Created(url, instance);
        }

        private Instance ExtractInstanceTemplate(MultipartRequestReader reader, int? instanceOwnerId)
        {
            Instance instanceTemplate = null;
            RequestPart instancePart = null;

            // assume that first part with no name is an instanceTemplate
            if (reader.Parts.Count == 1 && reader.Parts[0].ContentType.Contains("application/json") && reader.Parts[0].Name == null)
            {
                instancePart = reader.Parts[0];
            }
            else
            {
                instancePart = reader.Parts.Find(part => part.Name == "instance");
            }

            if (instancePart != null)
            {
                reader.Parts.Remove(instancePart);

                StreamReader streamReader = new StreamReader(instancePart.Stream, Encoding.UTF8);
                string content = streamReader.ReadToEnd();

                instanceTemplate = JsonConvert.DeserializeObject<Instance>(content);                
            }

            if (instanceOwnerId.HasValue)
            {
                instanceTemplate = instanceTemplate ?? new Instance();
                instanceTemplate.InstanceOwnerId = instanceOwnerId.Value.ToString();
            }

            return instanceTemplate;
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

            string selfLink = $"{host}{url}";

            int start = selfLink.IndexOf("/instances");
            if (start > 0)
            {
                selfLink = selfLink.Substring(0, start) + "/instances";
            }

            selfLink += $"/{instance.Id}";            

            if (!selfLink.EndsWith(instance.Id))
            {
                selfLink += instance.Id;
            }

            instance.SelfLinks = instance.SelfLinks ?? new ResourceLinks();
            instance.SelfLinks.Apps = selfLink;

            if (instance.Data != null)
            {
                foreach (DataElement dataElement in instance.Data)
                {
                    dataElement.DataLinks = dataElement.DataLinks ?? new ResourceLinks();

                    dataElement.DataLinks.Apps = $"{selfLink}/data/{dataElement.Id}";
                }
            }
        }

        /// <summary>
        /// Prepares the service implementation for a given dataElement, that has an xsd or json-schema.
        /// </summary>
        /// <param name="org">the organisation id</param>
        /// <param name="app">the app name</param>
        /// <param name="elementType">the data element type</param>
        /// <param name="startService">indicates if the servcie should be started or just opened</param>
        /// <returns>the serviceImplementation object which represents the application business logic</returns>
        private async Task<IServiceImplementation> PrepareServiceImplementation(string org, string app, string elementType, bool startService = false)
        {
            IServiceImplementation serviceImplementation = executionService.GetServiceImplementation(org, app, startService);

            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            ServiceContext serviceContext = executionService.GetServiceContext(org, app, startService);

            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);
            serviceImplementation.SetPlatformServices(platformService);

            return serviceImplementation;
        }

        /// <summary>
        /// Creates an event and dispatches it to the eventService for storage.
        /// </summary>
        private async Task DispatchEvent(string eventType, Instance instance)
        { 
            UserContext userContext = await userHelper.GetUserContext(HttpContext);

            string app = instance.AppId.Split("/")[1];
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
