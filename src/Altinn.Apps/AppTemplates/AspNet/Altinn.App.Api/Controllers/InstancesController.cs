using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Common.Helpers;
using Altinn.App.Common.RequestHandling;
using Altinn.App.Service.Interface;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
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
    [Authorize]
    [Route("{org}/{app}/instances")]
    [ApiController]
    public class InstancesController : ControllerBase
    {
        private readonly ILogger<InstancesController> _logger;
        private readonly IInstance _instanceService;
        private readonly IData _dataService;

        private readonly IAppResources _appResourcesService;
        private readonly IRegister _registerService;
        private readonly IAltinnApp _altinnApp;
        private readonly IProcess _processService;
        private readonly UserHelper _userHelper;
        private readonly IPDP _pdp;


        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        public InstancesController(
            ILogger<InstancesController> logger,
            IRegister registerService,
            IInstance instanceService,
            IData dataService,
            IAppResources appResourcesService,
            IAltinnApp altinnApp,
            IProcess processService,
            IPDP pdp,
            IProfile profileService,
            IOptions<GeneralSettings> generalSettings)
        {
            _logger = logger;
            _instanceService = instanceService;
            _dataService = dataService;
            _appResourcesService = appResourcesService;
            _registerService = registerService;
            _altinnApp = altinnApp;
            _processService = processService;

            _pdp = pdp;

            _userHelper = new UserHelper(profileService, registerService, generalSettings);
        }

        /// <summary>
        ///  Gets an instance object from storage.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <returns>the instance</returns>
        [Authorize(Policy = "InstanceRead")]
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
                Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
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
        [Authorize(Policy = "InstanceWrite")]
        [HttpPut("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
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
            if (instance == null ||
                !org.Equals(instance.Org) ||
                !instance.AppId.EndsWith(app) ||
                !instanceOwnerPartyId.Equals(int.Parse(instance.InstanceOwner.PartyId)) ||
                !instance.Id.EndsWith(instanceGuid.ToString()))
            {
                return BadRequest($"Inconsistent values between path params and instance attributes");
            }

            try
            {
                Instance updatedInstance = await _instanceService.UpdateInstance(instance);

                if (updatedInstance == null)
                {
                    return NotFound();
                }

                SelfLinkHelper.SetInstanceAppSelfLinks(updatedInstance, Request);

                return Ok(updatedInstance);
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
        [RequestSizeLimit(1000)]
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

            Application application = _appResourcesService.GetApplication();
            if (application == null)
            {
                return NotFound($"AppId {org}/{app} was not found");
            }

            MultipartRequestReader parsedRequest = new MultipartRequestReader(Request);
            await parsedRequest.Read();

            if (parsedRequest.Errors.Any())
            {
                return BadRequest($"Error when reading content: {JsonConvert.SerializeObject(parsedRequest.Errors)}");
            }

            Instance instanceTemplate = ExtractInstanceTemplate(parsedRequest);

            if (!instanceOwnerPartyId.HasValue && instanceTemplate == null)
            {
                return BadRequest("Cannot create an instance without an instanceOwner.partyId. Either provide instanceOwner party Id as a query parameter or an instanceTemplate object in the body.");
            }

            if (instanceOwnerPartyId.HasValue && instanceTemplate?.InstanceOwner?.PartyId != null)
            {
                return BadRequest("You cannot provide an instanceOwnerPartyId as a query param as well as an instance template in the body. Choose one or the other.");
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
                instanceTemplate = new Instance
                {
                    InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.Value.ToString() }
                };
            }

            Party party;
            try
            {
                party = await LookupParty(instanceTemplate);
            }
            catch (Exception partyLookupException)
            {
                return NotFound($"Cannot lookup party: {partyLookupException.Message}");
            }

            // TODO. Call PEP to verify if current user is authorized to create a instance for this party-
            // Action is instansiate. Use claims princial from context. The resource party from above party
            // The app and org. Call the new method in IPDP service. This API lib need to reference the PEP nuget to make this possible
            // If this method return false. Return NotAuthorized here
            // string org, string app, ClaimsPrincipal user, string actionType, string partyId
            XacmlJsonRequest request = DecisionHelper.CreateXacmlJsonRequest(org, app, HttpContext.User, "instantiate", party.PartyId.ToString());
            bool authorized = await _pdp.GetDecisionForUnvalidateRequest(request, HttpContext.User);

            if (!authorized)
            {
                return Forbid("Not Authorized");
            }

            if (!InstantiationHelper.IsPartyAllowedToInstantiate(party, application.PartyTypesAllowed))
            {
                return Forbid($"Party {party?.PartyId} is not allowed to instantiate this application {org}/{app}");
            }

            // use process controller to start process
            instanceTemplate.Process = null;

            Instance instance;
            try
            {
                instance = await _instanceService.CreateInstance(org, app, instanceTemplate);
                if (instance == null)
                {
                    throw new PlatformClientException("Failure instantiating instance. UnknownError");
                }
            }
            catch (Exception instanceException)
            {
                string message = $"Failure in multipart prefil. Could not create an instance of {org}/{app} for party {instanceTemplate.InstanceOwner.PartyId}.";

                _logger.LogError($"{message} - {instanceException}");
                return StatusCode(500, $"{message} - {instanceException.Message}");
            }

            try
            {
                await StorePrefillParts(instance, application, parsedRequest.Parts);

                // get the updated instance
                instance = await _instanceService.GetInstance(app, org, int.Parse(instance.InstanceOwner.PartyId), Guid.Parse(instance.Id.Split("/")[1]));
               
                string startEvent = await _altinnApp.OnInstantiateGetStartEvent(instance);

                if (startEvent != null)
                {
                    UserContext userContext = _userHelper.GetUserContext(HttpContext).Result;

                    Instance instanceStarted = await _processService.ProcessStartAndGotoNextTask(instance, startEvent, userContext);

                    instance = await _instanceService.UpdateInstance(instanceStarted);
                }

            }
            catch (Exception dataException)
            {
                string message = $"Failure storing multipart prefil data. Could not create a data element for {instance.Id} of {org}/{app}.";
                _logger.LogError($"{message} - {dataException}");

                // todo add compensating transaction (delete instance)                
                return StatusCode(500, $"{message} Exception: {dataException.Message}");
            }

            SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);
            string url = instance.SelfLinks.Apps;

            return Created(url, instance);
        }

        private async Task<Party> LookupParty(Instance instanceTemplate)
        {
            InstanceOwner instanceOwner = instanceTemplate.InstanceOwner;

            Party party;
            if (instanceOwner.PartyId != null)
            {
                try
                {
                    party = await _registerService.GetParty(int.Parse(instanceOwner.PartyId));
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
                catch (Exception e)
                {
                    _logger.LogWarning($"Failed to lookup party by partyId: {instanceOwner.PartyId}. The exception was: {e.Message}");
                    throw new PlatformClientException($"Failed to lookup party by partyId: {instanceOwner.PartyId}. The exception was: {e.Message}");
                }
            }
            else
            {
                string lookupNumber = "personNumber or organisationNumber";
                string personOrOrganisationNumber = instanceOwner.PersonNumber ?? instanceOwner.OrganisationNumber;
                try
                {
                    if (!string.IsNullOrEmpty(instanceOwner.PersonNumber))
                    {
                        lookupNumber = "personNumber";
                        party = await _registerService.LookupParty(instanceOwner.PersonNumber);
                    }
                    else if (!string.IsNullOrEmpty(instanceOwner.OrganisationNumber))
                    {
                        lookupNumber = "organisationNumber";
                        party = await _registerService.LookupParty(instanceOwner.OrganisationNumber);
                    }
                    else
                    {
                        throw new PlatformClientException("Neither personNumber or organisationNumber has value in instanceOwner");
                    }

                    instanceOwner.PartyId = party.PartyId.ToString();
                }
                catch (Exception e)
                {
                    _logger.LogWarning($"Failed to lookup party by {lookupNumber}: {personOrOrganisationNumber}. The exception was: {e}");
                    throw new PlatformClientException($"Failed to lookup party by {lookupNumber}: {personOrOrganisationNumber}. The exception was: {e.Message}");
                }
            }

            return party;
        }

        private async Task StorePrefillParts(Instance instance, Application appInfo, List<RequestPart> parts)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            int instanceOwnerIdAsInt = int.Parse(instance.InstanceOwner.PartyId);
            DataElement dataElement = null;
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];
          
            foreach (RequestPart part in parts)
            {
                DataType dataType = appInfo.DataTypes.Find(d => d.Id == part.Name);

                if (dataType.AppLogic != null)
                {
                    _logger.LogInformation($"Storing part {part.Name}");

                    Type type;
                    try
                    {
                        type = _altinnApp.GetAppModelType(dataType.AppLogic.ClassRef);
                    }
                    catch (Exception altinnAppException)
                    {
                        throw new ApplicationException($"App.GetAppModelType failed: {altinnAppException.Message}");
                    }
                    
                    object data = DataController.ParseFormDataAndDeserialize(type, part.ContentType, part.Stream, out string errorText);

                    if (!string.IsNullOrEmpty(errorText))
                    {
                        throw new InvalidOperationException(errorText);
                    }

                    dataElement = await _dataService.InsertFormData(
                        data,
                        instanceGuid,
                        type,
                        org,
                        app,
                        instanceOwnerIdAsInt,
                        part.Name);                 
                }
                else
                {
                    dataElement = await _dataService.InsertBinaryData(instance.Id, part.Name, part.ContentType, part.FileName, part.Stream);
                }

                if (dataElement == null)
                {
                    throw new InvalidOperationException($"Dataservice did not return a valid instance metadata when attempt to store data element {part.Name}");
                }
            }
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

                using StreamReader streamReader = new StreamReader(instancePart.Stream, Encoding.UTF8);
                string content = streamReader.ReadToEndAsync().Result;

                instanceTemplate = JsonConvert.DeserializeObject<Instance>(content);                
            }                        

            return instanceTemplate;
        }
    }
}
