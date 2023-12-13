#nullable enable
using System.Net;

using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Registers;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Common.PEP.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// The stateless data controller handles creation and calculation of data elements not related to an instance.
    /// </summary>
    [AutoValidateAntiforgeryTokenIfAuthCookie]
    [Route("{org}/{app}/v1/data")]
    public class StatelessDataController : ControllerBase
    {
        private readonly ILogger<DataController> _logger;
        private readonly IAppModel _appModel;
        private readonly IAppResources _appResourcesService;
        private readonly IEnumerable<IDataProcessor> _dataProcessors;
        private readonly IPrefill _prefillService;
        private readonly IAltinnPartyClient _altinnPartyClientClient;
        private readonly IPDP _pdp;

        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        private const string PartyPrefix = "partyid";
        private const string PersonPrefix = "person";
        private const string OrgPrefix = "org";

        /// <summary>
        /// The stateless data controller is responsible for creating and updating stateless data elements.
        /// </summary>
        public StatelessDataController(
            ILogger<DataController> logger,
            IAppModel appModel,
            IAppResources appResourcesService,
            IPrefill prefillService,
            IAltinnPartyClient altinnPartyClientClient,
            IPDP pdp,
            IEnumerable<IDataProcessor> dataProcessors)
        {
            _logger = logger;
            _appModel = appModel;
            _appResourcesService = appResourcesService;
            _dataProcessors = dataProcessors;
            _prefillService = prefillService;
            _altinnPartyClientClient = altinnPartyClientClient;
            _pdp = pdp;
        }

        /// <summary>
        /// Create a new data object of the defined data type
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="dataType">The data type id</param>
        /// <param name="partyFromHeader">The party that should be represented with  prefix "partyId:", "person:" or "org:" (eg: "partyId:123")</param>
        /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
        [Authorize]
        [HttpGet]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 200)]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] string dataType,
            [FromHeader(Name = "party")] string partyFromHeader)
        {
            if (string.IsNullOrEmpty(dataType))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            if (string.IsNullOrEmpty(classRef))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            InstanceOwner? owner = await GetInstanceOwner(partyFromHeader);
            if (owner is null)
            {
                return BadRequest($"Invalid party header. Please provide a party header on the form partyid:123, org:[orgnr] or person:[ssn]");
            }

            EnforcementResult enforcementResult = await AuthorizeAction(org, app, Convert.ToInt32(owner.PartyId), "read");

            if (!enforcementResult.Authorized)
            {
                return Forbidden(enforcementResult);
            }

            object appModel = _appModel.Create(classRef);

            // runs prefill from repo configuration if config exists
            await _prefillService.PrefillDataModel(owner.PartyId, dataType, appModel);

            Instance virtualInstance = new Instance() { InstanceOwner = owner };
            await ProcessAllDataWrite(virtualInstance, appModel);

            return Ok(appModel);
        }

        private async Task ProcessAllDataWrite(Instance virtualInstance, object appModel)
        {
            foreach (var dataProcessor in _dataProcessors)
            {
                _logger.LogInformation(
                    "ProcessDataRead for {modelType} using {dataProcesor}", 
                    appModel.GetType().Name,
                    dataProcessor.GetType().Name);
                await dataProcessor.ProcessDataRead(virtualInstance, null, appModel);
            }
        }

        /// <summary>
        /// Create a new data object of the defined data type
        /// </summary>
        /// <param name="dataType">The data type id</param>
        /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
        [AllowAnonymous]
        [HttpGet]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 200)]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        [Route("anonymous")]
        public async Task<ActionResult> GetAnonymous([FromQuery] string dataType)
        {
            if (string.IsNullOrEmpty(dataType))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            if (string.IsNullOrEmpty(classRef))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            object appModel = _appModel.Create(classRef);
            var virtualInstance = new Instance();
            await ProcessAllDataWrite(virtualInstance, appModel);

            return Ok(appModel);
        }

        /// <summary>
        /// Create a new data object of the defined data type
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="dataType">The data type id</param>
        /// <param name="partyFromHeader">The party that should be represented with  prefix "partyId:", "person:" or "org:" (eg: "partyId:123")</param>
        /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
        [Authorize]
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 200)]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<ActionResult> Post(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] string dataType,
            [FromHeader(Name = "party")] string partyFromHeader)
        {
            if (string.IsNullOrEmpty(dataType))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            if (string.IsNullOrEmpty(classRef))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            InstanceOwner? owner = await GetInstanceOwner(partyFromHeader);

            if (owner is null)
            {
                return BadRequest($"Invalid party header");
            }

            EnforcementResult enforcementResult = await AuthorizeAction(org, app, Convert.ToInt32(owner.PartyId), "read");

            if (!enforcementResult.Authorized)
            {
                return Forbidden(enforcementResult);
            }

            ModelDeserializer deserializer = new ModelDeserializer(_logger, _appModel.GetModelType(classRef));
            ModelDeserializerResult deserializerResult = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

            if (deserializerResult.HasError)
            {
                return BadRequest(deserializerResult.Error);
            }

            object appModel = deserializerResult.Model;

            // runs prefill from repo configuration if config exists
            await _prefillService.PrefillDataModel(owner.PartyId, dataType, appModel);

            Instance virtualInstance = new Instance() { InstanceOwner = owner };
            foreach (var dataProcessor in _dataProcessors)
            {
                _logger.LogInformation("ProcessDataRead for {modelType} using {dataProcesor}", appModel.GetType().Name, dataProcessor.GetType().Name);
                await dataProcessor.ProcessDataRead(virtualInstance, null, appModel);
            }

            return Ok(appModel);
        }

        /// <summary>
        /// Create a new data object of the defined data type
        /// </summary>
        /// <param name="dataType">The data type id</param>
        /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
        [AllowAnonymous]
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 200)]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        [Route("anonymous")]
        public async Task<ActionResult> PostAnonymous([FromQuery] string dataType)
        {
            if (string.IsNullOrEmpty(dataType))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            if (string.IsNullOrEmpty(classRef))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            ModelDeserializer deserializer = new ModelDeserializer(_logger, _appModel.GetModelType(classRef));
            ModelDeserializerResult deserializerResult = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

            if (deserializerResult.HasError)
            {
                return BadRequest(deserializerResult.Error);
            }

            Instance virtualInstance = new Instance();
            var appModel = deserializerResult.Model;
            foreach (var dataProcessor in _dataProcessors)
            {
                _logger.LogInformation("ProcessDataRead for {modelType} using {dataProcesor}", appModel.GetType().Name, dataProcessor.GetType().Name);
                await dataProcessor.ProcessDataRead(virtualInstance, null, appModel);
            }

            return Ok(deserializerResult.Model);
        }

        private async Task<InstanceOwner?> GetInstanceOwner(string? partyFromHeader)
        {
            // Use the party id of the logged in user, if no party id is given in the header
            // Not sure if this is really used anywhere. It doesn't seem useful, as you'd
            // always want to create an instance based on the selected party, not the person
            // you happened to log in as.
            if (partyFromHeader is null)
            {
                var partyId = Request.HttpContext.User.GetPartyIdAsInt();
                if (partyId is null)
                {
                    return null;
                }

                var partyFromUser = await _altinnPartyClientClient.GetParty(partyId.Value);
                if (partyFromUser is null)
                {
                    return null;
                }

                return InstantiationHelper.PartyToInstanceOwner(partyFromUser);
            }

            // Get the party as read in from the header. Authorization happens later.
            var headerParts = partyFromHeader.Split(':');
            if (partyFromHeader.Contains(',') || headerParts.Length != 2)
            {
                return null;
            }

            var id = headerParts[1];
            var idPrefix = headerParts[0].ToLowerInvariant();
            var party = idPrefix switch
            {
                PartyPrefix => await _altinnPartyClientClient.GetParty(int.TryParse(id, out var partyId) ? partyId : 0),

                // Frontend seems to only use partyId, not orgnr or ssn.
                PersonPrefix => await _altinnPartyClientClient.LookupParty(new PartyLookup { Ssn = id }),
                OrgPrefix => await _altinnPartyClientClient.LookupParty(new PartyLookup { OrgNo = id }),
                _ => null,
            };

            if (party is null || party.PartyId == 0)
            {
                return null;
            }

            return InstantiationHelper.PartyToInstanceOwner(party);
        }

        private async Task<EnforcementResult> AuthorizeAction(string org, string app, int partyId, string action)
        {
            EnforcementResult enforcementResult = new EnforcementResult();
            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(org, app, HttpContext.User, action, partyId, null);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

            if (response?.Response == null)
            {
                _logger.LogInformation($"// Instances Controller // Authorization of action {action} failed with request: {JsonConvert.SerializeObject(request)}.");
                return enforcementResult;
            }

            enforcementResult = DecisionHelper.ValidatePdpDecisionDetailed(response.Response, HttpContext.User);
            return enforcementResult;
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
