using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.Api.Filters;
using Altinn.App.Api.Mappers;
using Altinn.App.Api.Models;
using Altinn.App.Common.Constants;
using Altinn.App.Common.Helpers;
using Altinn.App.Common.RequestHandling;
using Altinn.App.Common.Serialization;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;

using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Common.PEP.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

using Newtonsoft.Json;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Controller for application instances for app-backend.
    /// You can create a new instance (POST), update it (PUT) and retrieve a specific instance (GET).
    /// </summary>
    [Authorize]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    [AutoValidateAntiforgeryTokenIfAuthCookie]
    [Route("{org}/{app}/instances")]
    [ApiController]
    public class InstancesController : ControllerBase
    {
        private readonly ILogger<InstancesController> _logger;

        private readonly IInstance _instanceClient;
        private readonly IData _dataClient;
        private readonly IRegister _registerClient;
        private readonly IEvents _eventsService;
        private readonly IProfile _profileClientClient;

        private readonly IAppResources _appResourcesService;
        private readonly IAltinnApp _altinnApp;
        private readonly IProcess _processService;
        private readonly IPDP _pdp;
        private readonly IPrefill _prefillService;

        private readonly AppSettings _appSettings;

        private const long RequestSizeLimit = 2000 * 1024 * 1024;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        public InstancesController(
            ILogger<InstancesController> logger,
            IRegister registerClient,
            IInstance instanceClient,
            IData dataClient,
            IAppResources appResourcesService,
            IAltinnApp altinnApp,
            IProcess processService,
            IPDP pdp,
            IEvents eventsService,
            IOptions<AppSettings> appSettings,
            IPrefill prefillService,
            IProfile profileClient)
        {
            _logger = logger;
            _instanceClient = instanceClient;
            _dataClient = dataClient;
            _appResourcesService = appResourcesService;
            _registerClient = registerClient;
            _altinnApp = altinnApp;
            _processService = processService;
            _pdp = pdp;
            _eventsService = eventsService;
            _appSettings = appSettings.Value;
            _prefillService = prefillService;
            _profileClientClient = profileClient;
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
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            EnforcementResult enforcementResult = await AuthorizeAction(org, app, instanceOwnerPartyId, instanceGuid, "read");

            if (!enforcementResult.Authorized)
            {
                return Forbidden(enforcementResult);
            }

            try
            {
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

                string userOrgClaim = User.GetOrg();

                if (userOrgClaim == null || !org.Equals(userOrgClaim, StringComparison.InvariantCultureIgnoreCase))
                {
                    await _instanceClient.UpdateReadStatus(instanceOwnerPartyId, instanceGuid, "read");
                }

                return Ok(instance);
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Get instance {instanceOwnerPartyId}/{instanceGuid} failed");
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
        [RequestSizeLimit(RequestSizeLimit)]
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

            Instance instanceTemplate = await ExtractInstanceTemplate(parsedRequest);

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

            if (instanceTemplate != null)
            {
                InstanceOwner lookup = instanceTemplate.InstanceOwner;

                if (lookup == null || (lookup.PersonNumber == null && lookup.OrganisationNumber == null && lookup.PartyId == null))
                {
                    return BadRequest("Error: instanceOwnerPartyId query parameter is empty and InstanceOwner is missing from instance template. You must populate instanceOwnerPartyId or InstanceOwner");
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
                party = await LookupParty(instanceTemplate.InstanceOwner);
            }
            catch (Exception partyLookupException)
            {
                if (partyLookupException is ServiceException)
                {
                    ServiceException sexp = partyLookupException as ServiceException;

                    if (sexp.StatusCode.Equals(HttpStatusCode.Unauthorized))
                    {
                        return StatusCode((int)HttpStatusCode.Forbidden);
                    }
                }

                return NotFound($"Cannot lookup party: {partyLookupException.Message}");
            }

            EnforcementResult enforcementResult = await AuthorizeAction(org, app, party.PartyId, null, "instantiate");

            if (!enforcementResult.Authorized)
            {
                return Forbidden(enforcementResult);
            }

            if (!InstantiationHelper.IsPartyAllowedToInstantiate(party, application.PartyTypesAllowed))
            {
                return StatusCode((int)HttpStatusCode.Forbidden, $"Party {party.PartyId} is not allowed to instantiate this application {org}/{app}");
            }

            // Run custom app logic to validate instantiation
            InstantiationValidationResult validationResult = await _altinnApp.RunInstantiationValidation(instanceTemplate);
            if (validationResult != null && !validationResult.Valid)
            {
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

                string userOrgClaim = User.GetOrg();

                if (userOrgClaim == null || !org.Equals(userOrgClaim, StringComparison.InvariantCultureIgnoreCase))
                {
                    instanceTemplate.Status ??= new InstanceStatus();
                    instanceTemplate.Status.ReadStatus = ReadStatus.Read;
                }

                // create the instance
                instance = await _instanceClient.CreateInstance(org, app, instanceTemplate);
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Instantiation of appId {org}/{app} failed for party {instanceTemplate.InstanceOwner?.PartyId}");
            }

            try
            {
                await StorePrefillParts(instance, application, parsedRequest.Parts);

                // get the updated instance
                instance = await _instanceClient.GetInstance(app, org, int.Parse(instance.InstanceOwner.PartyId), Guid.Parse(instance.Id.Split("/")[1]));

                // notify app and store events
                await ProcessController.NotifyAppAboutEvents(_altinnApp, instance, processResult.Events);
                await _processService.DispatchProcessEventsToStorage(instance, processResult.Events);
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Instantiation of data elements failed for instance {instance.Id} for party {instanceTemplate.InstanceOwner?.PartyId}");
            }

            await RegisterEvent("app.instance.created", instance);

            SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);
            string url = instance.SelfLinks.Apps;

            return Created(url, instance);
        }

        /// <summary>
        /// Simplified Instanciation with support for fieldprefill 
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instansiationInstance">instansiation information</param>
        /// <returns>The new instance</returns>
        [HttpPost("create")]
        [DisableFormValueModelBinding]
        [Produces("application/json")]
        [ProducesResponseType(typeof(Instance), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [RequestSizeLimit(RequestSizeLimit)]
        public async Task<ActionResult<Instance>> PostSimplified(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromBody] InstansiationInstance instansiationInstance)
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

            InstanceOwner lookup = instansiationInstance.InstanceOwner;

            if (lookup == null || (lookup.PersonNumber == null && lookup.OrganisationNumber == null && lookup.PartyId == null))
            {
                return BadRequest("Error: instanceOwnerPartyId query parameter is empty and InstanceOwner is missing from instance template. You must populate instanceOwnerPartyId or InstanceOwner");
            }

            Party party;
            try
            {
                party = await LookupParty(instansiationInstance.InstanceOwner);
            }
            catch (Exception partyLookupException)
            {
                if (partyLookupException is ServiceException)
                {
                    ServiceException sexp = partyLookupException as ServiceException;

                    if (sexp.StatusCode.Equals(HttpStatusCode.Unauthorized))
                    {
                        return StatusCode((int)HttpStatusCode.Forbidden);
                    }
                }

                return NotFound($"Cannot lookup party: {partyLookupException.Message}");
            }

            EnforcementResult enforcementResult = await AuthorizeAction(org, app, party.PartyId, null, "instantiate");

            if (!enforcementResult.Authorized)
            {
                return Forbidden(enforcementResult);
            }

            if (!InstantiationHelper.IsPartyAllowedToInstantiate(party, application.PartyTypesAllowed))
            {
                return StatusCode((int)HttpStatusCode.Forbidden, $"Party {party.PartyId} is not allowed to instantiate this application {org}/{app}");
            }

            Instance instanceTemplate = new Instance() { InstanceOwner = instansiationInstance.InstanceOwner };

            // Run custom app logic to validate instantiation
            InstantiationValidationResult validationResult = await _altinnApp.RunInstantiationValidation(instanceTemplate);
            if (validationResult != null && !validationResult.Valid)
            {
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

                string userOrgClaim = User.GetOrg();

                if (userOrgClaim == null || !org.Equals(userOrgClaim, StringComparison.InvariantCultureIgnoreCase))
                {
                    instanceTemplate.Status ??= new InstanceStatus();
                    instanceTemplate.Status.ReadStatus = ReadStatus.Read;
                }

                instance = await _instanceClient.CreateInstance(org, app, instanceTemplate);

                if (!string.IsNullOrEmpty(instansiationInstance.SourceInstanceId) && application.CopyInstanceSettings?.Enabled == true)
                {
                    await CopyDataFromSourceInstance(application, instansiationInstance.SourceInstanceId, instance);
                }

                instance = await _instanceClient.GetInstance(instance);

                // notify app and store events
                await ProcessController.NotifyAppAboutEvents(_altinnApp, instance, processResult.Events, instansiationInstance.Prefill);
                await _processService.DispatchProcessEventsToStorage(instance, processResult.Events);
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Instantiation of appId {org}/{app} failed for party {instanceTemplate.InstanceOwner?.PartyId}");
            }

            await RegisterEvent("app.instance.created", instance);

            SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);
            string url = instance.SelfLinks.Apps;

            return Created(url, instance);
        }

        private async Task CopyDataFromSourceInstance(Application application, string sourceInstanceId, Instance instance)
        {
            string[] sourceSplit = sourceInstanceId.Split("/");

            string sourceInstanceOwner = sourceSplit[0];
            Guid sourceInstanceGuid = Guid.Parse(sourceSplit[1]);
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

            if (!instance.InstanceOwner.PartyId.Equals(sourceInstanceOwner))
            {
                return;
            }

            Instance source = await _instanceClient.GetInstance(
                app,
                org,
                instanceOwnerPartyId,
                sourceInstanceGuid);

            if (source.Process.Ended == null)
            {
                return;
            }

            List<DataType> dts = application.DataTypes
                .Where(dt => dt.AppLogic != null)
                .Where(dt => dt.TaskId != null && dt.TaskId.Equals(instance.Process.CurrentTask.ElementId))
                .ToList();
            List<string> excludedDataTypes = application.CopyInstanceSettings.ExcludedDataTypes;

            foreach (DataElement de in source.Data)
            {
                if (excludedDataTypes != null && excludedDataTypes.Contains(de.DataType))
                {
                    continue;
                }

                if (dts.Any(dts => dts.Id.Equals(de.DataType)))
                {
                    DataType dt = dts.First(dt => dt.Id.Equals(de.DataType));

                    Type type;
                    try
                    {
                        type = _altinnApp.GetAppModelType(dt.AppLogic.ClassRef);
                    }
                    catch (Exception altinnAppException)
                    {
                        throw new ServiceException(HttpStatusCode.InternalServerError, $"App.GetAppModelType failed: {altinnAppException.Message}", altinnAppException);
                    }

                    ModelDeserializer deserializer = new ModelDeserializer(_logger, type);
                    object data = await _dataClient.GetFormData(sourceInstanceGuid, type, org, app, instanceOwnerPartyId, Guid.Parse(de.Id));

                    if (application.CopyInstanceSettings.ExcludedDataFields != null)
                    {
                        DataHelper.ResetDataFields(application.CopyInstanceSettings.ExcludedDataFields, data.GetType().ToString(), data);
                    }

                    await _prefillService.PrefillDataModel(instanceOwnerPartyId.ToString(), dt.Id, data);

                    try
                    {
                        await _altinnApp.RunDataCreation(instance, data, null);
                    }
                    catch (NotImplementedException)
                    {
                        // Trigger application business logic the old way. DEPRECATED
                        await _altinnApp.RunDataCreation(instance, data);
                    }

                    DataElement dataElement = await _dataClient.InsertFormData(
                        data,
                        Guid.Parse(instance.Id.Split("/")[1]),
                        type,
                        org,
                        app,
                        instanceOwnerPartyId,
                        dt.Id);
                }
            }
        }

        /// <summary>
        /// Add complete confirmation.
        /// </summary>
        /// <remarks>
        /// Add to an instance that a given stakeholder considers the instance as no longer needed by them. The stakeholder has
        /// collected all the data and information they needed from the instance and expect no additional data to be added to it.
        /// The body of the request isn't used for anything despite this being a POST operation.
        /// </remarks>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
        /// <returns>Returns the instance with updated list of confirmations.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_COMPLETE)]
        [HttpPost("{instanceOwnerPartyId:int}/{instanceGuid:guid}/complete")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Produces("application/json")]
        public async Task<ActionResult<Instance>> AddCompleteConfirmation(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            try
            {
                Instance instance = await _instanceClient.AddCompleteConfirmation(instanceOwnerPartyId, instanceGuid);
                SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

                return Ok(instance);
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Adding complete confirmation to instance {instanceOwnerPartyId}/{instanceGuid} failed");
            }
        }

        /// <summary>
        /// Allows an app owner to update the substatus of an instance.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance to update.</param>
        /// <param name="substatus">The new substatus of the instance.</param>
        /// <returns>Returns the instance with updated substatus.</returns>
        [Authorize]
        [HttpPut("{instanceOwnerPartyId:int}/{instanceGuid:guid}/substatus")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<Instance>> UpdateSubstatus(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromBody] Substatus substatus)
        {
            if (substatus == null || string.IsNullOrEmpty(substatus.Label))
            {
                return BadRequest($"Invalid sub status: {JsonConvert.SerializeObject(substatus)}. Substatus must be defined and include a label.");
            }

            Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

            string orgClaim = User.GetOrg();
            if (!instance.Org.Equals(orgClaim))
            {
                return Forbid();
            }

            try
            {
                Instance updatedInstance = await _instanceClient.UpdateSubstatus(instanceOwnerPartyId, instanceGuid, substatus);
                SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

                await RegisterEvent("app.instance.substatus.changed", instance);

                return Ok(updatedInstance);
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Updating substatus for instance {instanceOwnerPartyId}/{instanceGuid} failed.");
            }
        }

        /// <summary>
        /// Deletes an instance.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance to delete.</param>
        /// <param name="hard">A value indicating whether the instance should be unrecoverable.</param>
        /// <returns>Returns the deleted instance.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_DELETE)]
        [HttpDelete("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Produces("application/json")]
        public async Task<ActionResult<Instance>> DeleteInstance(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] bool hard)
        {
            try
            {
                Instance deletedInstance = await _instanceClient.DeleteInstance(instanceOwnerPartyId, instanceGuid, hard);
                SelfLinkHelper.SetInstanceAppSelfLinks(deletedInstance, Request);

                return Ok(deletedInstance);
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, $"Deleting instance {instanceOwnerPartyId}/{instanceGuid} failed.");
            }
        }

        /// <summary>
        /// Retrieves all active instances that fulfull the org, app, and instanceOwnerParty Id combination.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <returns>A list of light weight instance objects that contains instanceId, lastChanged and lastChangedBy (full name).</returns>
        [Authorize]
        [HttpGet("{instanceOwnerPartyId:int}/active")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Produces("application/json")]
        public async Task<ActionResult<List<SimpleInstance>>> GetActiveInstances([FromRoute] string org, [FromRoute] string app, int instanceOwnerPartyId)
        {
            Dictionary<string, StringValues> queryParams = new()
            {
                { "appId", $"{org}/{app}" },
                { "instanceOwner.partyId", instanceOwnerPartyId.ToString() },
                { "status.isArchived", "false" },
                { "status.isSoftDeleted", "false" }
            };

            List<Instance> activeInstances = await _instanceClient.GetInstances(queryParams);

            if (!activeInstances.Any())
            {
                return Ok(new List<SimpleInstance>());
            }

            List<string> userAndOrgIds = activeInstances.Select(i => i.LastChangedBy).Distinct().ToList();

            Dictionary<string, string> userAndOrgLookup = new Dictionary<string, string>();

            foreach (string userOrOrgId in userAndOrgIds)
            {
                if (userOrOrgId.Length == 9)
                {
                    Organization organization = await _registerClient.ER.GetOrganization(userOrOrgId);
                    userAndOrgLookup.Add(userOrOrgId, organization.Name);
                }
                else
                {
                    UserProfile user = await _profileClientClient.GetUserProfile(int.Parse(userOrOrgId));
                    userAndOrgLookup.Add(userOrOrgId, user.Party.Name);
                }
            }

            return SimpleInstanceMapper.MapInstanceListToSimpleInstanceList(activeInstances, userAndOrgLookup);
        }

        private ActionResult ExceptionResponse(Exception exception, string message)
        {
            _logger.LogError($"{message}: {exception}");

            if (exception is PlatformHttpException platformHttpException)
            {
                return platformHttpException.Response.StatusCode switch
                {
                    HttpStatusCode.Forbidden => Forbid(),
                    HttpStatusCode.NotFound => NotFound(),
                    HttpStatusCode.Conflict => Conflict(),
                    _ => StatusCode((int)platformHttpException.Response.StatusCode, platformHttpException.Message),
                };
            }

            if (exception is ServiceException se)
            {
                return StatusCode((int)se.StatusCode, se.Message);
            }

            return StatusCode(500, $"{message}");
        }

        private async Task<EnforcementResult> AuthorizeAction(string org, string app, int partyId, Guid? instanceGuid, string action)
        {
            EnforcementResult enforcementResult = new EnforcementResult();
            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(org, app, HttpContext.User, action, partyId, instanceGuid);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

            if (response?.Response == null)
            {
                _logger.LogInformation($"// Instances Controller // Authorization of action {action} failed with request: {JsonConvert.SerializeObject(request)}.");
                return enforcementResult;
            }

            enforcementResult = DecisionHelper.ValidatePdpDecisionDetailed(response.Response, HttpContext.User);
            return enforcementResult;
        }

        private async Task<Party> LookupParty(InstanceOwner instanceOwner)
        {
            Party party;
            if (instanceOwner.PartyId != null)
            {
                try
                {
                    party = await _registerClient.GetParty(int.Parse(instanceOwner.PartyId));
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
                catch (ServiceException)
                {
                    // Just rethrow service exception
                    throw;
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
                        party = await _registerClient.LookupParty(new PartyLookup { Ssn = instanceOwner.PersonNumber });
                    }
                    else if (!string.IsNullOrEmpty(instanceOwner.OrganisationNumber))
                    {
                        lookupNumber = "organisationNumber";
                        party = await _registerClient.LookupParty(new PartyLookup { OrgNo = instanceOwner.OrganisationNumber });
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
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            foreach (RequestPart part in parts)
            {
                DataType dataType = appInfo.DataTypes.Find(d => d.Id == part.Name);

                DataElement dataElement;
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

                    ModelDeserializer deserializer = new ModelDeserializer(_logger, type);
                    object data = await deserializer.DeserializeAsync(part.Stream, part.ContentType);

                    if (!string.IsNullOrEmpty(deserializer.Error))
                    {
                        throw new InvalidOperationException(deserializer.Error);
                    }

                    await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, part.Name, data);
                    try
                    {
                        await _altinnApp.RunDataCreation(instance, data, null);
                    }
                    catch (NotImplementedException)
                    {
                        // Trigger application business logic the old way. DEPRECATED
                        await _altinnApp.RunDataCreation(instance, data);
                    }

                    dataElement = await _dataClient.InsertFormData(
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
                    dataElement = await _dataClient.InsertBinaryData(instance.Id, part.Name, part.ContentType, part.FileName, part.Stream);
                }

                if (dataElement == null)
                {
                    throw new ServiceException(HttpStatusCode.InternalServerError, $"Data service did not return a valid instance metadata when attempt to store data element {part.Name}");
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
        private static async Task<Instance> ExtractInstanceTemplate(MultipartRequestReader reader)
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
                string content = await streamReader.ReadToEndAsync();

                instanceTemplate = JsonConvert.DeserializeObject<Instance>(content);
            }

            return instanceTemplate;
        }

        private async Task RegisterEvent(string eventType, Instance instance)
        {
            if (_appSettings.RegisterEventsWithEventsComponent)
            {
                try
                {
                    await _eventsService.AddEvent(eventType, instance);
                }
                catch (Exception exception)
                {
                    _logger.LogWarning(exception, "Exception when sending event with the Events component.");
                }
            }
        }

        private ActionResult Forbidden(EnforcementResult enforcementResult)
        {
            if (enforcementResult.FailedObligations != null && enforcementResult.FailedObligations.Count > 0)
            {
                return StatusCode((int)HttpStatusCode.Forbidden, enforcementResult.FailedObligations);
            }

            return StatusCode((int)HttpStatusCode.Forbidden);
        }
    }
}
