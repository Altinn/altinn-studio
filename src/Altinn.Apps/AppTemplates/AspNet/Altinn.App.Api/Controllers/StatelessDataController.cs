using System;
using System.Net;
using System.Threading.Tasks;

using Altinn.App.Api.Filters;

using Altinn.App.Common.Serialization;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Interface;
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
using Microsoft.Extensions.Primitives;
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
        private readonly IAltinnApp _altinnApp;
        private readonly IAppResources _appResourcesService;
        private readonly IPrefill _prefillService;
        private readonly IRegister _registerService;
        private readonly IPDP _pdp;
        private readonly IAltinnAppContextAccessor _altinnAppContext;

        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        private const string Partyheader = "party";
        private const string PartyPrefix = "partyid:";
        private const string PersonPrefix = "person:";
        private const string OrgPrefix = "org:";

        /// <summary>
        /// The stateless data controller is responsible for creating and updating stateles data elements.
        /// </summary>
        public StatelessDataController(
            ILogger<DataController> logger,
            IAltinnApp altinnApp,
            IAppResources appResourcesService,
            IPrefill prefillService,
            IRegister registerService,
            IPDP pdp,
            IAltinnAppContextAccessor altinnAppContext)
        {
            _logger = logger;
            _altinnApp = altinnApp;
            _appResourcesService = appResourcesService;
            _prefillService = prefillService;
            _registerService = registerService;
            _pdp = pdp;
            _altinnAppContext = altinnAppContext;
        }

        /// <summary>
        /// Create a new data object of the defined data type
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="dataType">The data type id</param>
        /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
        [Authorize]
        [HttpGet]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 200)]
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] string dataType)
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

            if (GetPartyHeader(HttpContext).Count > 1)
            {
                return BadRequest($"Invalid party. Only one allowed");
            }

            int? partyId = await GetPartyId(HttpContext);

            if (!partyId.HasValue)
            {
                return StatusCode((int)HttpStatusCode.Forbidden);
            }

            EnforcementResult enforcementResult = await AuthorizeAction(org, app, partyId.Value, "read");

            if (!enforcementResult.Authorized)
            {
                return Forbidden(enforcementResult);
            }

            _altinnAppContext.SetContext(new AltinnAppContext() { PartyId = partyId.Value });
        
            object appModel = _altinnApp.CreateNewAppModel(classRef);
   
            // runs prefill from repo configuration if config exists
            await _prefillService.PrefillDataModel(partyId.ToString(), dataType, appModel);

            Instance virutalInstance = new Instance() { InstanceOwner = new InstanceOwner() { PartyId = partyId.ToString() } };
            await _altinnApp.RunProcessDataRead(virutalInstance, null, appModel);

            return Ok(appModel);
        }

        /// <summary>
        /// Create a new data object of the defined data type
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="dataType">The data type id</param>
        /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
        [Authorize]
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 200)]
        public async Task<ActionResult> Post(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] string dataType)
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

            if (GetPartyHeader(HttpContext).Count > 1)
            {
                return BadRequest($"Invalid party. Only one allowed");
            }

            int? partyId = await GetPartyId(HttpContext);

            if (!partyId.HasValue)
            {
               return StatusCode((int)HttpStatusCode.Forbidden);
            }

            EnforcementResult enforcementResult = await AuthorizeAction(org, app, partyId.Value, "read");

            if (!enforcementResult.Authorized)
            {
                return Forbidden(enforcementResult);
            }

            ModelDeserializer deserializer = new ModelDeserializer(_logger, _altinnApp.GetAppModelType(classRef));
            object appModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

            if (!string.IsNullOrEmpty(deserializer.Error))
            {
                return BadRequest(deserializer.Error);
            }

            // runs prefill from repo configuration if config exists
            await _prefillService.PrefillDataModel(partyId.ToString(), dataType, appModel);

            Instance virutalInstance = new Instance() { InstanceOwner = new InstanceOwner() { PartyId = partyId.ToString() } };
            await _altinnApp.RunProcessDataRead(virutalInstance, null, appModel);

            return Ok(appModel);
        }

        private static StringValues GetPartyHeader(HttpContext context)
        {
            StringValues partyValues;
            if (context.Request.Headers.TryGetValue(Partyheader, out partyValues))
            {
                return partyValues;
            }

            return partyValues;
        }

        private async Task<int?> GetPartyId(HttpContext context)
        {
            StringValues partyValues;
            if (context.Request.Headers.TryGetValue(Partyheader, out partyValues))
            {
                return await GetPartyId(partyValues[0]);
            }
            else
            {
               return context.User.GetPartyIdAsInt();
            }
        }

        private async Task<int?> GetPartyId(string partyValue)
        {
            Party party = null;
            if (partyValue.StartsWith(PartyPrefix))
            {
                return Convert.ToInt32(partyValue.Replace(PartyPrefix, string.Empty));
            }
            else if (partyValue.StartsWith(PersonPrefix))
            {
                party = await _registerService.LookupParty(new PartyLookup { Ssn = partyValue.Replace(PersonPrefix, string.Empty) });
            }
            else if (partyValue.StartsWith(OrgPrefix))
            {
                party = await _registerService.LookupParty(new PartyLookup { OrgNo = partyValue.Replace(OrgPrefix, string.Empty) });
            }

            if (party != null)
            {
                return party.PartyId;
            }

            return null;
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
