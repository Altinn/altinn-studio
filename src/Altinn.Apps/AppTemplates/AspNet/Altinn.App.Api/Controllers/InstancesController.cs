using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Common.Helpers;
using Altinn.App.Common.Interface;
using Altinn.App.Common.RequestHandling;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Controller for application instances for app-backend.
    /// You can create a new instance (POST), update it (PUT) and retreive a specific instance (GET).
    /// </summary>
    [Route("{org}/{app}/instances")]
    [ApiController]
    public class InstancesController : ControllerBase
    {
        private readonly ILogger<InstancesController> logger;
        private readonly IInstance instanceService;
        private readonly IData dataService;

        private readonly IExecution executionService;
        private readonly IRegister registerService;
        private readonly IRepository repositoryService;
        private readonly IAltinnApp altinnApp;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        public InstancesController(
            ILogger<InstancesController> logger,
            IRegister registerService,
            IInstance instanceService,
            IData dataService,
            IExecution executionService,
            IProfile profileService,
            IRepository repositoryService,
            IAltinnApp altinnApp)
        {
            this.logger = logger;
            this.instanceService = instanceService;
            this.dataService = dataService;
            this.executionService = executionService;
            this.registerService = registerService;
            this.repositoryService = repositoryService;
            this.altinnApp = altinnApp;
        }

        /// <summary>
        ///  Gets an instance object from storage.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <returns>the instance</returns>
        [Authorize]
        [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(Instance), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            try
            {
                Instance instance = await instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                if (instance == null)
                {
                    return NotFound();
                }

                SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

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
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="instance">the instance with attributes that should be updated</param>
        /// <returns>the updated instance</returns>
        [Authorize]
        [HttpPut("{instanceOwnerId:int}/{instanceGuid:guid}")]
        [Produces("application/json")]
        [Consumes("application/json")]
        [ProducesResponseType(typeof(Instance), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> Put(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromBody] Instance instance)
        {
            try
            {
                Instance updatedInstance = await instanceService.UpdateInstance(instance, app, org, instanceOwnerPartyId, instanceGuid);

                if (instance == null)
                {
                    return NotFound();
                }

                SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

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
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <returns>the created instance</returns>
        [HttpPost]
        [DisableFormValueModelBinding]
        [Produces("application/json")]
        [ProducesResponseType(typeof(Instance), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<Instance>> Post(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] int? instanceOwnerPartyId)
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

            if (!instanceOwnerPartyId.HasValue && instanceTemplate == null)
            {
                return BadRequest("Cannot create an instance without an instanceOwnerId. Either provide instanceOwnerId as a query parameter or an instanceTemplate object in the body.");
            }

            if (instanceOwnerPartyId.HasValue && instanceTemplate != null)
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
                InstanceOwner lookup = instanceTemplate.InstanceOwner;

                if (string.IsNullOrEmpty(instanceTemplate.InstanceOwner.PartyId) && (lookup == null || (lookup.PersonNumber == null && lookup.OrganisationNumber == null)))
                {
                    return BadRequest($"Error: instanceOwnerPartyId query parameter is empty and InstanceOwner is missing from instance template. You must populate instanceOwnerPartyId or InstanceOwner");
                }
            }
            else
            {
                instanceTemplate = new Instance();
                instanceTemplate.InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.Value.ToString() };
            }

            Party party = null;
            InstanceOwner instanceOwner = instanceTemplate.InstanceOwner;

            if (instanceOwner.PartyId != null)
            {
                party = await registerService.GetParty(int.Parse(instanceTemplate.InstanceOwner.PartyId));
                if (!string.IsNullOrEmpty(party.SSN))
                {
                    instanceOwner.PersonNumber = party.SSN;
                    instanceOwner.OrganisationNumber = null;
                }
                else if (!string.IsNullOrEmpty(party.OrgNumber))
                {
                    instanceOwner.PersonNumber = null;
                    instanceOwner.OrganisationNumber = party.OrgNumber;
                }
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
                string message = $"Failure in multipart prefil. Could not create an instance of {org}/{app} for {instanceOwnerPartyId}. App-backend has problem accessing platform storage.";

                logger.LogError($"{message} - {instanceException}");
                return StatusCode(500, $"{message} - {instanceException.Message}");
            }

            try
            {
                DataElement dataElement = await StorePrefillParts(instance, parsedRequest.Parts);

                // get the updated instance
                instance = await instanceService.GetInstance(app, org, int.Parse(instance.InstanceOwner.PartyId), Guid.Parse(instance.Id.Split("/")[1]));
            }
            catch (Exception dataException)
            {
                string message = $"Failure storing multipart prefil. Could not create a data element for {instance.Id} of {org}/{app}. App-backend has problem accessing platform storage.";
                logger.LogError($"{message} - {dataException}");

                // todo add compensating transaction (delete instance)                
                return StatusCode(500, $"{message} - {dataException.Message}");
            }

            SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);
            string url = instance.SelfLinks.Apps;

            return Created(url, instance);
        }

        private async Task<DataElement> StorePrefillParts(Instance instance, List<RequestPart> parts)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            int instanceOwnerIdAsInt = int.Parse(instance.InstanceOwner.PartyId);
            DataElement dataElement = null;
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            foreach (RequestPart part in parts)
            {
                logger.LogInformation($"Storing part {part.Name}");
                object data = new StreamReader(part.Stream).ReadToEnd();

                // TODO. Datatype

                dataElement = await dataService.InsertFormData(
                    data,
                    instanceGuid,
                    altinnApp.GetAppModelType("default"),
                    org,
                    app,
                    instanceOwnerIdAsInt,
                    "default");

                if (dataElement == null)
                {
                    throw new InvalidOperationException($"Dataservice did not return a valid instance metadata when attempt to store data element {part.Name}");
                }
            }

            return dataElement;
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
    }
}
