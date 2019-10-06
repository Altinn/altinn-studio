using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Implementation;
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
        private readonly IInstance instanceService;
        private readonly IData dataService;

        private readonly IExecution executionService;
        private readonly UserHelper userHelper;
        private readonly IRegister registerService;
        private readonly IRepository repositoryService;
        private readonly IPlatformServices platformService;

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
            IRepository repositoryService)
        {
            this.logger = logger;
            this.instanceService = instanceService;
            this.dataService = dataService;
            this.executionService = executionService;
            this.registerService = registerService;
            this.platformService = platformService;
            this.repositoryService = repositoryService;

            userHelper = new UserHelper(profileService, registerService, generalSettings);
        }

        /// <summary>
        ///  Gets an instance object from storage.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
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
            try
            {
                Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
                if (instance == null)
                {
                    return NotFound();
                }

                SetAppSelfLinks(instance, Request);

                return Ok(instance);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"{ex.Message}");
            }            
        }

        /// <summary>
        ///  Updates an instance object in storage.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
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
            try
            {
                Instance updatedInstance = await instanceService.UpdateInstance(instance, app, org, instanceOwnerId, instanceGuid);

                if (instance == null)
                {
                    return NotFound();
                }

                SetAppSelfLinks(instance, Request);

                return Ok(instance);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"{ex.Message}");
            }
        }

        /// <summary>
        /// Creates a new instance of an application in platform storage. Clients can send a instance as a json or send a
        /// multipart form-data with the instance in the first part named "instance" and the prefill data in the next parts, with
        /// names that correspond to the element types defined in the application metadata.
        /// The data elements are stored. Currently calculate and validate is not implemented. 
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
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

            Instance instanceTemplate = ExtractInstanceTemplate(parsedRequest);

            if (!instanceOwnerId.HasValue && instanceTemplate == null)
            {
                return BadRequest("Cannot create an instance without an instanceOwnerId. Either provide instanceOwnerId as a query parameter or an instanceTemplate object in the body.");
            }

            if (instanceOwnerId.HasValue && instanceTemplate != null)
            {
                return BadRequest("You cannot provide an instanceOwnerId as a query param as well as an instance template in the body. Choose one or the other.");
            }

            RequestPartValidator requestValidator = new RequestPartValidator(application);

            string multipartError = requestValidator.ValidateParts(parsedRequest.Parts);

            if (!string.IsNullOrEmpty(multipartError))
            {
                return BadRequest($"Error when comparing content to application metadata: {multipartError}");
            }

            // extract or create instance template
            if (instanceTemplate != null)
            {
                InstanceOwnerLookup lookup = instanceTemplate.InstanceOwnerLookup;

                if (string.IsNullOrEmpty(instanceTemplate.InstanceOwnerId) && (lookup == null || (lookup.PersonNumber == null && lookup.OrganisationNumber == null)))
                {
                    return BadRequest($"Error: instanceOwnerId is empty and InstanceOwnerLookup is missing. You must populate instanceOwnerId or InstanceOwnerLookup");
                }
            }
            else
            {
                instanceTemplate = new Instance();
                instanceTemplate.InstanceOwnerId = instanceOwnerId.Value.ToString();
            }

            Party party = null;

            if (instanceTemplate.InstanceOwnerId != null)
            {
                party = await registerService.GetParty(int.Parse(instanceTemplate.InstanceOwnerId));
            }
            else
            {
                /* todo - lookup personNumber or organisationNumber - awaiting registry endpoint implementation */
            }

            if (!InstantiationHelper.IsPartyAllowedToInstantiate(party, application.PartyTypesAllowed))
            {
                return Forbid($"Party {party?.PartyId} is not allowed to instantiate this application {org}/{app}");
            }

            // use process controller to start process
            instanceTemplate.Process = null;

            Instance instance = null;
            try
            {
                instance = await instanceService.CreateInstance(org, app, instanceTemplate);
                if (instance == null)
                {
                    throw new PlatformClientException("Failure instantiating instance. UnknownError");
                }
            }
            catch (Exception instanceException)
            {
                string message = $"Failure in multipart prefil. Could not create an instance of {org}/{app} for {instanceOwnerId}. App-backend has problem accessing platform storage.";

                logger.LogError($"{message} - {instanceException}");
                return StatusCode(500, $"{message} - {instanceException.Message}");
            }

            try
            {
                Instance instanceWithData = await StorePrefillParts(instance, parsedRequest.Parts);

                if (instanceWithData != null)
                {
                    instance = instanceWithData;
                }
            }
            catch (Exception dataException)
            {
                string message = $"Failure storing multipart prefil. Could not create a data element for {instance.Id} of {org}/{app}. App-backend has problem accessing platform storage.";
                logger.LogError($"{message} - {dataException}");

                // todo add compensating transaction (delete instance)                
                return StatusCode(500, $"{message} - {dataException.Message}");
            }            

            SetAppSelfLinks(instance, Request);
            string url = instance.SelfLinks.Apps;

            return Created(url, instance);
        }

        private async Task<Instance> StorePrefillParts(Instance instance, List<RequestPart> parts)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            int instanceOwnerIdAsInt = int.Parse(instance.InstanceOwnerId);
            Instance instanceWithData = null;
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            foreach (RequestPart part in parts)
            {
                logger.LogInformation($"Storing part {part.Name}");
                object data = new StreamReader(part.Stream).ReadToEnd();

                IServiceImplementation serviceImplementation = await PrepareServiceImplementation(org, app, part.Name, true);

                instanceWithData = await dataService.InsertFormData(
                    data,
                    instanceGuid,
                    serviceImplementation.GetServiceModelType(),
                    org,
                    app,
                    instanceOwnerIdAsInt);

                if (instanceWithData == null)
                {
                    throw new InvalidOperationException($"Dataservice did not return a valid instance metadata when attempt to store data element {part.Name}");
                }
            }

            return instanceWithData;
        }

        /// <summary>
        /// Extracts the instance template from a multipart reader, which contains a number of parts. If the reader contains
        /// only one part and it has no name and contentType application/json it is assumed to be an instance template.
        ///
        /// If found the method removes the part corresponding to the instance template form the parts list.
        /// </summary>
        /// <param name="reader">multipart reader object</param>
        /// <returns>the instance template or null if none is found</returns>
        private Instance ExtractInstanceTemplate(MultipartRequestReader reader)
        {
            Instance instanceTemplate = null;

            RequestPart instancePart = reader.Parts.Find(part => part.Name == "instance");

            // assume that first part with no name is an instanceTemplate
            if (instancePart == null && reader.Parts.Count == 1 && reader.Parts[0].ContentType.Contains("application/json") && reader.Parts[0].Name == null)
            {
                instancePart = reader.Parts[0];
            }
                        
            if (instancePart != null)
            {
                reader.Parts.Remove(instancePart);

                StreamReader streamReader = new StreamReader(instancePart.Stream, Encoding.UTF8);
                string content = streamReader.ReadToEnd();

                instanceTemplate = JsonConvert.DeserializeObject<Instance>(content);                
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
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="elementType">the data element type</param>
        /// <param name="startApp">indicates if the app should be started or just opened</param>
        /// <returns>the serviceImplementation object which represents the application business logic</returns>
        private async Task<IServiceImplementation> PrepareServiceImplementation(string org, string app, string elementType, bool startApp = false)
        {
            logger.LogInformation($"Preparing data element instantiation for {elementType}");

            IServiceImplementation serviceImplementation = executionService.GetServiceImplementation(org, app, startApp);

            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            ServiceContext serviceContext = executionService.GetServiceContext(org, app, startApp);

            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);
            serviceImplementation.SetPlatformServices(platformService);

            return serviceImplementation;
        }
    }
}
