#nullable enable
using System.Net;

using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Mappers;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.AppModel;
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
        private readonly IDataProcessor _dataProcessor;
        private readonly IPrefill _prefillService;
        private readonly IRegister _registerClient;
        private readonly IPDP _pdp;

        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        private const string PartyPrefix = "partyid";
        private const string PersonPrefix = "person";
        private const string OrgPrefix = "org";

        /// <summary>
        /// The stateless data controller is responsible for creating and updating stateles data elements.
        /// </summary>
        public StatelessDataController(
            ILogger<DataController> logger,
            IAppModel appModel,
            IAppResources appResourcesService,
            IDataProcessor dataProcessor,
            IPrefill prefillService,
            IRegister registerClient,
            IPDP pdp)
        {
            _logger = logger;
            _appModel = appModel;
            _appResourcesService = appResourcesService;
            _dataProcessor = dataProcessor;
            _prefillService = prefillService;
            _registerClient = registerClient;
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

            Instance virutalInstance = new Instance() { InstanceOwner = owner };
            await _dataProcessor.ProcessDataRead(virutalInstance, null, appModel);

            return Ok(appModel);
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

            var virutalInstance = new Instance();

            await _dataProcessor.ProcessDataRead(virutalInstance, null, appModel);

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
            object? appModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

            if (!string.IsNullOrEmpty(deserializer.Error))
            {
                return BadRequest(deserializer.Error);
            }

            // runs prefill from repo configuration if config exists
            await _prefillService.PrefillDataModel(owner.PartyId, dataType, appModel);

            Instance virutalInstance = new Instance() { InstanceOwner = owner };
            await _dataProcessor.ProcessDataRead(virutalInstance, null, appModel);

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
            object? appModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

            if (!string.IsNullOrEmpty(deserializer.Error))
            {
                return BadRequest(deserializer.Error);
            }

            Instance virutalInstance = new Instance();
            await _dataProcessor.ProcessDataRead(virutalInstance, null, appModel);

            return Ok(appModel);
        }

        private async Task<InstanceOwner?> GetInstanceOwner(string partyFromHeader)
        {
            // Use the party id of the logged in user, if no party id is given in the header
            // Not sure if this is really used anywhere. It doesn't seem usefull, as you'd
            // always want to create an instance based on the selected party, not the person
            // you happend to log in as.
            if (partyFromHeader is null)
            {
                var partyId = Request.HttpContext.User.GetPartyIdAsInt();
                if (partyId is null)
                {
                    return null;
                }

                var partyFromUser = await _registerClient.GetParty(partyId.Value);
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
                PartyPrefix => await _registerClient.GetParty(int.TryParse(id, out var partyId) ? partyId : 0),

                // Frontend seems to only use partyId, not orgnr or ssn.
                PersonPrefix => await _registerClient.LookupParty(new PartyLookup { Ssn = id }),
                OrgPrefix => await _registerClient.LookupParty(new PartyLookup { OrgNo = id }),
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
