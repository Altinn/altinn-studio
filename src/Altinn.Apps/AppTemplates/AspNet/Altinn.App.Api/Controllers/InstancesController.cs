using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Api.Filters;
using Altinn.App.Common.Constants;
using Altinn.App.Common.Helpers;
using Altinn.App.Common.RequestHandling;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.App.Services.Models.Validation;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Common.PEP.Models;
using Altinn.Platform.Register.Models;
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
    [AutoValidateAntiforgeryTokenIfAuthCookie]
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
            IPDP pdp)
        {
            _logger = logger;
            _instanceService = instanceService;
            _dataService = dataService;
            _appResourcesService = appResourcesService;
            _registerService = registerService;
            _altinnApp = altinnApp;
            _processService = processService;

            _pdp = pdp;
        }

        /// <summary>
        ///  Gets an instance object from storage.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <returns>the instance</returns>
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
            Party party = await _registerService.GetParty(instanceOwnerPartyId);
            EnforcementResult enforcementResult = await AuthorizeAction(org, app, party, "read");

            if (!enforcementResult.Authorized)
            {
                if (enforcementResult.FailedObligations != null && enforcementResult.FailedObligations.Count > 0)
                {
                    return StatusCode((int)HttpStatusCode.Forbidden, enforcementResult.FailedObligations);
                }

                return StatusCode((int)HttpStatusCode.Forbidden);
            }

            try
            {
                Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

                return Ok(instance);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Get instance {instanceOwnerPartyId}/{instanceGuid} failed");
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Get instance {instanceOwnerPartyId}/{instanceGuid} failed");
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
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
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

                SelfLinkHelper.SetInstanceAppSelfLinks(updatedInstance, Request);

                return Ok(updatedInstance);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Update of instance {instanceOwnerPartyId}/{instanceGuid} failed.");
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Update of instance {instanceOwnerPartyId}/{instanceGuid} failed.");
            }
        }

        /// <summary>
        /// Creates a new instance of an application in platform storage. Clients can send an instance as json or send a
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
                // create minimum instance template
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

            EnforcementResult enforcementResult = await AuthorizeAction(org, app, party, "instantiate");

            if (!enforcementResult.Authorized)
            {
                if (enforcementResult.FailedObligations != null && enforcementResult.FailedObligations.Count > 0)
                {
                    return StatusCode((int)HttpStatusCode.Forbidden, enforcementResult.FailedObligations);
                }

                return StatusCode((int)HttpStatusCode.Forbidden);
            }

            if (!InstantiationHelper.IsPartyAllowedToInstantiate(party, application.PartyTypesAllowed))
            {
                return StatusCode((int)HttpStatusCode.Forbidden, $"Party {party?.PartyId} is not allowed to instantiate this application {org}/{app}");
            }

            // Run custom app logic to validate instantiation
            InstantiationValidationResult validationResult = await _altinnApp.RunInstantiationValidation(instanceTemplate);
            if (validationResult != null && !validationResult.Valid)
            {
                // Todo. Figure out where to get this from
                Dictionary<string, Dictionary<string, string>> serviceText = new Dictionary<string, Dictionary<string, string>>();
                return StatusCode((int)HttpStatusCode.Forbidden, validationResult);
            }

            Instance instance;
            ProcessStateChange processResult;
            try
            {
                // start process and goto next task
                instanceTemplate.Process = null;
                string startEvent = await _altinnApp.OnInstantiateGetStartEvent();
                processResult = _processService.ProcessStartAndGotoNextTask(instanceTemplate, startEvent, User);

                // create the instance
                instance = await _instanceService.CreateInstance(org, app, instanceTemplate);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Instantiation of appId {org}/{app} failed for party {instanceTemplate.InstanceOwner?.PartyId}");
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Instantiation of appId {org}/{app} failed for party {instanceTemplate.InstanceOwner?.PartyId}");
            }

            try
            {
                await StorePrefillParts(instance, application, parsedRequest.Parts);

                // get the updated instance
                instance = await _instanceService.GetInstance(app, org, int.Parse(instance.InstanceOwner.PartyId), Guid.Parse(instance.Id.Split("/")[1]));

                // notify app and store events
                await ProcessController.NotifyAppAboutEvents(_altinnApp, instance, processResult.Events);
                await _processService.DispatchProcessEventsToStorage(instance, processResult.Events);
            }
            catch (PlatformHttpException e)
            {
                HandlePlatformHttpException(e, $"Instatiation of data elements failed for instance {instance.Id} for party {instanceTemplate.InstanceOwner?.PartyId}");
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Instatiation of data elements failed for instance {instance.Id} for party {instanceTemplate.InstanceOwner?.PartyId}");
            }

            SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);
            string url = instance.SelfLinks.Apps;

            return Created(url, instance);
        }

        private ActionResult ExceptionResponse(Exception exception, string message)
        {
            _logger.LogError($"{message}: {exception}");

            if (exception is PlatformHttpException)
            {
                PlatformHttpException phe = exception as PlatformHttpException;
                return StatusCode((int)phe.Response.StatusCode, phe.Message);
            }
            else if (exception is ServiceException)
            {
                ServiceException se = exception as ServiceException;
                return StatusCode((int)se.StatusCode, se.Message);
            }

            return StatusCode(500, $"{message}");
        }

        private async Task<EnforcementResult> AuthorizeAction(string org, string app, Party party, string action)
        {
            EnforcementResult enforcementResult = new EnforcementResult();
            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(org, app, HttpContext.User, action, party.PartyId.ToString(), null);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

            if (response?.Response == null)
            {
                _logger.LogInformation($"// Instances Controller // Authorization of action {action} failed with request: {JsonConvert.SerializeObject(request)}.");
                return enforcementResult;
            }

            enforcementResult = DecisionHelper.ValidatePdpDecisionDetailed(response.Response, HttpContext.User);
            return enforcementResult;
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
                    throw new ServiceException(HttpStatusCode.BadRequest, $"Failed to lookup party by partyId: {instanceOwner.PartyId}. The exception was: {e.Message}", e);
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
                        throw new ServiceException(HttpStatusCode.BadRequest, "Neither personNumber or organisationNumber has value in instanceOwner");
                    }

                    instanceOwner.PartyId = party.PartyId.ToString();
                }
                catch (Exception e)
                {
                    _logger.LogWarning($"Failed to lookup party by {lookupNumber}: {personOrOrganisationNumber}. The exception was: {e}");
                    throw new ServiceException(HttpStatusCode.BadRequest, $"Failed to lookup party by {lookupNumber}: {personOrOrganisationNumber}. The exception was: {e.Message}", e);
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
                        throw new ServiceException(HttpStatusCode.InternalServerError, $"App.GetAppModelType failed: {altinnAppException.Message}", altinnAppException);
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
                    throw new ServiceException(HttpStatusCode.InternalServerError, $"Dataservice did not return a valid instance metadata when attempt to store data element {part.Name}");
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

        private ActionResult HandlePlatformHttpException(PlatformHttpException e, string defaultMessage)
        {
            if (e.Response.StatusCode == HttpStatusCode.Forbidden)
            {
                return Forbid();
            }
            else if (e.Response.StatusCode == HttpStatusCode.NotFound)
            {
                return NotFound();
            }
            else if (e.Response.StatusCode == HttpStatusCode.Conflict)
            {
                return Conflict();
            }
            else
            {
                return ExceptionResponse(e, defaultMessage);
            }
        }
    }
}
