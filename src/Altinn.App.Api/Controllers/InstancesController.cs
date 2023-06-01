#nullable enable

using System.Net;
using System.Text;
using Altinn.App.Api.Helpers.RequestHandling;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Mappers;
using Altinn.App.Api.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.Validation;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Common.PEP.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        private readonly IAppMetadata _appMetadata;
        private readonly IAppModel _appModel;
        private readonly IInstantiationProcessor _instantiationProcessor;
        private readonly IInstantiationValidator _instantiationValidator;
        private readonly IPDP _pdp;
        private readonly IPrefill _prefillService;
        private readonly AppSettings _appSettings;
        private readonly IProcessEngine _processEngine;

        private const long RequestSizeLimit = 2000 * 1024 * 1024;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        public InstancesController(
            ILogger<InstancesController> logger,
            IRegister registerClient,
            IInstance instanceClient,
            IData dataClient,
            IAppMetadata appMetadata,
            IAppModel appModel,
            IInstantiationProcessor instantiationProcessor,
            IInstantiationValidator instantiationValidator,
            IPDP pdp,
            IEvents eventsService,
            IOptions<AppSettings> appSettings,
            IPrefill prefillService,
            IProfile profileClient, 
            IProcessEngine processEngine)
        {
            _logger = logger;
            _instanceClient = instanceClient;
            _dataClient = dataClient;
            _appMetadata = appMetadata;
            _registerClient = registerClient;
            _appModel = appModel;
            _instantiationProcessor = instantiationProcessor;
            _instantiationValidator = instantiationValidator;
            _pdp = pdp;
            _eventsService = eventsService;
            _appSettings = appSettings.Value;
            _prefillService = prefillService;
            _profileClientClient = profileClient;
            _processEngine = processEngine;
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

                string? userOrgClaim = User.GetOrg();

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

            MultipartRequestReader parsedRequest = new MultipartRequestReader(Request);
            await parsedRequest.Read();

            if (parsedRequest.Errors.Any())
            {
                return BadRequest($"Error when reading content: {JsonConvert.SerializeObject(parsedRequest.Errors)}");
            }

            Instance? instanceTemplate = await ExtractInstanceTemplate(parsedRequest);

            if (instanceOwnerPartyId is null && instanceTemplate is null)
            {
                return BadRequest("Cannot create an instance without an instanceOwner.partyId. Either provide instanceOwner party Id as a query parameter or an instanceTemplate object in the body.");
            }

            if (instanceOwnerPartyId is not null && instanceTemplate?.InstanceOwner?.PartyId is not null)
            {
                return BadRequest("You cannot provide an instanceOwnerPartyId as a query param as well as an instance template in the body. Choose one or the other.");
            }

            if (instanceTemplate is not null)
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

            ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();

            RequestPartValidator requestValidator = new RequestPartValidator(application);
            string multipartError = requestValidator.ValidateParts(parsedRequest.Parts);

            if (!string.IsNullOrEmpty(multipartError))
            {
                return BadRequest($"Error when comparing content to application metadata: {multipartError}");
            }

            Party party;
            try
            {
                party = await LookupParty(instanceTemplate.InstanceOwner);
                instanceTemplate.InstanceOwner = InstantiationHelper.PartyToInstanceOwner(party);
            }
            catch (Exception partyLookupException)
            {
                if (partyLookupException is ServiceException sexp)
                {
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
            InstantiationValidationResult? validationResult = await _instantiationValidator.Validate(instanceTemplate);
            if (validationResult != null && !validationResult.Valid)
            {
                return StatusCode((int)HttpStatusCode.Forbidden, validationResult);
            }

            instanceTemplate.Org = application.Org;
            ConditionallySetReadStatus(instanceTemplate);

            Instance instance;
            instanceTemplate.Process = null;
            ProcessStateChange? change = null;
            
            try
            {
                // start process and goto next task
                ProcessStartRequest processStartRequest = new ProcessStartRequest
                {
                    Instance = instanceTemplate,
                    User = User,
                    Dryrun = true
                };
                var result = await _processEngine.StartProcess(processStartRequest);
                if (!result.Success)
                {
                    return Conflict(result.ErrorMessage);
                }
                
                change = result.ProcessStateChange;

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
                var request = new ProcessStartRequest()
                {
                    Instance = instance,
                    User = User,
                    Dryrun = false,
                };
                _logger.LogInformation("Events sent to process engine: {Events}", change?.Events);
                await _processEngine.UpdateInstanceAndRerunEvents(request, change?.Events);
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

            ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();

            bool copySourceInstance = !string.IsNullOrEmpty(instansiationInstance.SourceInstanceId);
            if (copySourceInstance && application.CopyInstanceSettings?.Enabled != true)
            {
                return BadRequest("Creating instance based on a copy from an archived instance is not enabled for this app.");
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
                instansiationInstance.InstanceOwner = InstantiationHelper.PartyToInstanceOwner(party);
            }
            catch (Exception partyLookupException)
            {
                if (partyLookupException is ServiceException sexp)
                {
                    if (sexp.StatusCode.Equals(HttpStatusCode.Unauthorized))
                    {
                        return StatusCode((int)HttpStatusCode.Forbidden);
                    }
                }

                return NotFound($"Cannot lookup party: {partyLookupException.Message}");
            }

            if (copySourceInstance && party.PartyId.ToString() != instansiationInstance.SourceInstanceId.Split("/")[0])
            {
                return BadRequest("It is not possible to copy instances between instance owners.");
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

            Instance instanceTemplate = new Instance()
            {
                InstanceOwner = instansiationInstance.InstanceOwner,
                VisibleAfter = instansiationInstance.VisibleAfter,
                DueBefore = instansiationInstance.DueBefore
            };

            instanceTemplate.Org = application.Org;
            ConditionallySetReadStatus(instanceTemplate);

            // Run custom app logic to validate instantiation
            InstantiationValidationResult? validationResult = await _instantiationValidator.Validate(instanceTemplate);
            if (validationResult != null && !validationResult.Valid)
            {
                return StatusCode((int)HttpStatusCode.Forbidden, validationResult);
            }

            Instance instance;
            ProcessChangeResult processResult;
            try
            {
                // start process and goto next task
                instanceTemplate.Process = null;

                var request = new ProcessStartRequest()
                {
                    Instance = instanceTemplate,
                    User = User,
                    Dryrun = true,
                    Prefill = instansiationInstance.Prefill
                };
                
                processResult = await _processEngine.StartProcess(request);

                Instance? source = null;

                if (copySourceInstance)
                {
                    string[] sourceSplit = instansiationInstance.SourceInstanceId.Split("/");
                    Guid sourceInstanceGuid = Guid.Parse(sourceSplit[1]);

                    try
                    {
                        source = await _instanceClient.GetInstance(app, org, party.PartyId, sourceInstanceGuid);
                    }
                    catch (PlatformHttpException exception)
                    {
                        return StatusCode(500, $"Retrieving source instance failed with status code {exception.Response.StatusCode}");
                    }

                    if (!source.Status.IsArchived)
                    {
                        return BadRequest("It is not possible to copy an instance that isn't archived.");
                    }
                }

                instance = await _instanceClient.CreateInstance(org, app, instanceTemplate);

                if (copySourceInstance)
                {
                    await CopyDataFromSourceInstance(application, instance, source);
                }

                instance = await _instanceClient.GetInstance(instance);

                var updateRequest = new ProcessStartRequest()
                {
                    Instance = instance,
                    User = User,
                    Dryrun = false,
                    Prefill = instansiationInstance.Prefill
                };
                await _processEngine.UpdateInstanceAndRerunEvents(updateRequest, processResult.ProcessStateChange?.Events);
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

        /// <summary>
        /// This method handles the copy endpoint for when a user wants to create a copy of an existing instance.
        /// The endpoint will primarily be accessed directly by a user clicking the copy button for an archived instance.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">Unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">Unique id to identify the instance</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        /// <remarks>
        /// The endpoint will return a redirect to the new instance if the copy operation was successful.
        /// </remarks>
        [Obsolete("This endpoint will be removed in a future release of the app template packages.")]
        [ApiExplorerSettings(IgnoreApi = true)]
        [Authorize]
        [HttpGet("/{org}/{app}/legacy/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/copy")]
        [ProducesResponseType(typeof(Instance), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> CopyInstance(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            // This endpoint should be used exclusively by end users. Ideally from a browser as a request after clicking
            // a button in the message box, but for now we simply just exclude app owner(s).
            string? orgClaim = User.GetOrg();
            if (orgClaim is not null)
            {
                return Forbid();
            }

            ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();

            if (application.CopyInstanceSettings?.Enabled is null or false)
            {
                return BadRequest("Creating instance based on a copy from an archived instance is not enabled for this app.");
            }

            EnforcementResult readAccess = await AuthorizeAction(org, app, instanceOwnerPartyId, instanceGuid, "read");

            if (!readAccess.Authorized)
            {
                return Forbidden(readAccess);
            }

            Instance? sourceInstance = await GetInstance(org, app, instanceOwnerPartyId, instanceGuid);

            if (sourceInstance?.Status?.IsArchived is null or false)
            {
                return BadRequest("The instance being copied must be archived.");
            }

            EnforcementResult instantiateAccess = await AuthorizeAction(org, app, instanceOwnerPartyId, null, "instantiate");

            if (!instantiateAccess.Authorized)
            {
                return Forbidden(instantiateAccess);
            }

            // Multiple properties like Org and AppId will be set by Storage
            Instance targetInstance = new()
            {
                InstanceOwner = sourceInstance.InstanceOwner,
                VisibleAfter = sourceInstance.VisibleAfter,
                Status = new() { ReadStatus = ReadStatus.Read }
            };

            InstantiationValidationResult? validationResult = await _instantiationValidator.Validate(targetInstance);
            if (validationResult != null && !validationResult.Valid)
            {
                return StatusCode((int)HttpStatusCode.Forbidden, validationResult);
            }
            
            ProcessStartRequest processStartRequest = new()
            {
                Instance = targetInstance,
                User = User,
                Dryrun = true
            };
            var startResult = await _processEngine.StartProcess(processStartRequest);

            targetInstance = await _instanceClient.CreateInstance(org, app, targetInstance);

            await CopyDataFromSourceInstance(application, targetInstance, sourceInstance);

            targetInstance = await _instanceClient.GetInstance(targetInstance);

            ProcessStartRequest rerunRequest = new()
            {
                Instance = targetInstance,
                Dryrun = false,
                User = User
            };
            await _processEngine.UpdateInstanceAndRerunEvents(rerunRequest, startResult.ProcessStateChange?.Events);

            await RegisterEvent("app.instance.created", targetInstance);

            string url = SelfLinkHelper.BuildFrontendSelfLink(targetInstance, Request);

            return Redirect(url);
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

            string? orgClaim = User.GetOrg();
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

            var lastChangedByValues = activeInstances.Select(i => i.LastChangedBy).Distinct();

            Dictionary<string, string> userAndOrgLookup = new Dictionary<string, string>();

            foreach (string lastChangedBy in lastChangedByValues)
            {
                if (lastChangedBy?.Length == 9)
                {
                    Organization? organization = await _registerClient.ER.GetOrganization(lastChangedBy);
                    if (organization is not null && !string.IsNullOrEmpty(organization.Name))
                    {
                        userAndOrgLookup.Add(lastChangedBy, organization.Name);
                    }
                }
                else if (int.TryParse(lastChangedBy, out int lastChangedByInt))
                {
                    UserProfile? user = await _profileClientClient.GetUserProfile(lastChangedByInt);
                    if (user is not null && user.Party is not null && !string.IsNullOrEmpty(user.Party.Name))
                    {
                        userAndOrgLookup.Add(lastChangedBy, user.Party.Name);
                    }
                }
            }

            return Ok(SimpleInstanceMapper.MapInstanceListToSimpleInstanceList(activeInstances, userAndOrgLookup));
        }

        private async Task<Instance?> GetInstance(string org, string app, int instanceOwnerPartyId, Guid instanceGuid)
        {
            try
            {
                return await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            }
            catch (PlatformHttpException platformHttpException)
            {
                switch (platformHttpException.Response.StatusCode)
                {
                    case HttpStatusCode.Forbidden: // Storage returns 403 for non-existing instances
                    case HttpStatusCode.NotFound:
                        return null;
                    default:
                        throw;
                }
            }
        }

        private void ConditionallySetReadStatus(Instance instance)
        {
            string? orgClaimValue = User.GetOrg();

            if (orgClaimValue == instance.Org)
            {
                // Default value for ReadStatus is "not read"
                return;
            }

            instance.Status ??= new InstanceStatus();
            instance.Status.ReadStatus = ReadStatus.Read;
        }

        private async Task CopyDataFromSourceInstance(ApplicationMetadata application, Instance targetInstance, Instance sourceInstance)
        {
            string org = application.Org;
            string app = application.AppIdentifier.App;
            int instanceOwnerPartyId = int.Parse(targetInstance.InstanceOwner.PartyId);

            string[] sourceSplit = sourceInstance.Id.Split("/");
            Guid sourceInstanceGuid = Guid.Parse(sourceSplit[1]);

            List<DataType> dts = application.DataTypes
                .Where(dt => dt.AppLogic?.ClassRef != null)
                .Where(dt => dt.TaskId != null && dt.TaskId.Equals(targetInstance.Process.CurrentTask.ElementId))
                .ToList();
            List<string> excludedDataTypes = application.CopyInstanceSettings.ExcludedDataTypes;

            foreach (DataElement de in sourceInstance.Data)
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
                        type = _appModel.GetModelType(dt.AppLogic.ClassRef);
                    }
                    catch (Exception altinnAppException)
                    {
                        throw new ServiceException(HttpStatusCode.InternalServerError, $"App.GetAppModelType failed: {altinnAppException.Message}", altinnAppException);
                    }

                    object data = await _dataClient.GetFormData(sourceInstanceGuid, type, org, app, instanceOwnerPartyId, Guid.Parse(de.Id));

                    if (application.CopyInstanceSettings.ExcludedDataFields != null)
                    {
                        DataHelper.ResetDataFields(application.CopyInstanceSettings.ExcludedDataFields, data);
                    }

                    await _prefillService.PrefillDataModel(instanceOwnerPartyId.ToString(), dt.Id, data);

                    await _instantiationProcessor.DataCreation(targetInstance, data, null);

                    await _dataClient.InsertFormData(
                        data,
                        Guid.Parse(targetInstance.Id.Split("/")[1]),
                        type,
                        org,
                        app,
                        instanceOwnerPartyId,
                        dt.Id);

                    await UpdatePresentationTextsOnInstance(application.PresentationFields, targetInstance, dt.Id, data);
                    await UpdateDataValuesOnInstance(application.DataFields, targetInstance, dt.Id, data);
                }
            }
        }

        private ActionResult ExceptionResponse(Exception exception, string message)
        {
            _logger.LogError(exception, message);

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
                string serializedRequest = JsonConvert.SerializeObject(request);
                _logger.LogInformation("// Instances Controller // Authorization of action {action} failed with request: {serializedRequest}.", action, serializedRequest);
                return enforcementResult;
            }

            enforcementResult = DecisionHelper.ValidatePdpDecisionDetailed(response.Response, HttpContext.User);
            return enforcementResult;
        }

        private async Task<Party> LookupParty(InstanceOwner instanceOwner)
        {
            if (instanceOwner.PartyId != null)
            {
                try
                {
                    return await _registerClient.GetParty(int.Parse(instanceOwner.PartyId));
                }
                catch (Exception e) when (e is not ServiceException)
                {
                    _logger.LogWarning(e, "Failed to lookup party by partyId: {partyId}", instanceOwner.PartyId);
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
                        return await _registerClient.LookupParty(new PartyLookup { Ssn = instanceOwner.PersonNumber });
                    }
                    else if (!string.IsNullOrEmpty(instanceOwner.OrganisationNumber))
                    {
                        lookupNumber = "organisationNumber";
                        return await _registerClient.LookupParty(new PartyLookup { OrgNo = instanceOwner.OrganisationNumber });
                    }
                    else
                    {
                        throw new ServiceException(HttpStatusCode.BadRequest, "Neither personNumber or organisationNumber has value in instanceOwner");
                    }
                }
                catch (Exception e)
                {
                    _logger.LogWarning(e, "Failed to lookup party by {lookupNumber}: {personOrOrganisationNumber}", lookupNumber, personOrOrganisationNumber);
                    throw new ServiceException(HttpStatusCode.BadRequest, $"Failed to lookup party by {lookupNumber}: {personOrOrganisationNumber}. The exception was: {e.Message}", e);
                }
            }
        }

        private async Task StorePrefillParts(Instance instance, ApplicationMetadata appInfo, List<RequestPart> parts)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            int instanceOwnerIdAsInt = int.Parse(instance.InstanceOwner.PartyId);
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            foreach (RequestPart part in parts)
            {
                DataType? dataType = appInfo.DataTypes.Find(d => d.Id == part.Name);

                DataElement dataElement;
                if (dataType?.AppLogic?.ClassRef != null)
                {
                    _logger.LogInformation($"Storing part {part.Name}");

                    Type type;
                    try
                    {
                        type = _appModel.GetModelType(dataType.AppLogic.ClassRef);
                    }
                    catch (Exception altinnAppException)
                    {
                        throw new ServiceException(HttpStatusCode.InternalServerError, $"App.GetAppModelType failed: {altinnAppException.Message}", altinnAppException);
                    }

                    ModelDeserializer deserializer = new ModelDeserializer(_logger, type);
                    object? data = await deserializer.DeserializeAsync(part.Stream, part.ContentType);

                    if (!string.IsNullOrEmpty(deserializer.Error))
                    {
                        throw new InvalidOperationException(deserializer.Error);
                    }

                    await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, part.Name, data);

                    await _instantiationProcessor.DataCreation(instance, data, null);

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
        private static async Task<Instance?> ExtractInstanceTemplate(MultipartRequestReader reader)
        {
            Instance? instanceTemplate = null;

            RequestPart? instancePart = reader.Parts.Find(part => part.Name == "instance");

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

        private async Task UpdatePresentationTextsOnInstance(List<DataField> presentationFields, Instance instance, string dataType, object data)
        {
            var updatedValues = DataHelper.GetUpdatedDataValues(
                presentationFields,
                instance.PresentationTexts,
                dataType,
                data);

            if (updatedValues.Count > 0)
            {
                await _instanceClient.UpdatePresentationTexts(
                    int.Parse(instance.Id.Split("/")[0]),
                    Guid.Parse(instance.Id.Split("/")[1]),
                    new PresentationTexts { Texts = updatedValues });
            }
        }

        private async Task UpdateDataValuesOnInstance(List<DataField> dataFields, Instance instance, string dataType, object data)
        {
            var updatedValues = DataHelper.GetUpdatedDataValues(
                dataFields,
                instance.DataValues,
                dataType,
                data);

            if (updatedValues.Count > 0)
            {
                await _instanceClient.UpdateDataValues(
                    int.Parse(instance.Id.Split("/")[0]),
                    Guid.Parse(instance.Id.Split("/")[1]),
                    new DataValues { Values = updatedValues });
            }
        }
    }
}
