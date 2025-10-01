using System.Globalization;
using System.Text.Json;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
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

namespace Altinn.App.Api.Controllers;

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
    private readonly IPrefill _prefillService;
    private readonly IAltinnPartyClient _altinnPartyClient;
    private readonly IPDP _pdp;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly AppImplementationFactory _appImplementationFactory;

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
        IAltinnPartyClient altinnPartyClient,
        IPDP pdp,
        IAuthenticationContext authenticationContext,
        IServiceProvider serviceProvider
    )
    {
        _logger = logger;
        _appModel = appModel;
        _appResourcesService = appResourcesService;
        _prefillService = prefillService;
        _altinnPartyClient = altinnPartyClient;
        _pdp = pdp;
        _authenticationContext = authenticationContext;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Create a new data object of the defined data type
    /// </summary>
    /// <param name="org">unique identfier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="dataType">The data type id</param>
    /// <param name="partyFromHeader">The party that should be represented with  prefix "partyId:", "person:" or "org:" (eg: "partyId:123")</param>
    /// <param name="prefill">Prefilled fields from query parameters</param>
    /// <param name="includeRowId">Whether to initialize or remove AltinnRowId fields in the model</param>
    /// <param name="language">Currently selected language by the user (if available)</param>
    /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
    [Authorize]
    [HttpGet]
    [DisableFormValueModelBinding]
    [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
    [ProducesResponseType(typeof(DataElement), 200)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> Get(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] string dataType,
        [FromHeader(Name = "party")] string partyFromHeader,
        [FromQuery] string? prefill,
        [FromQuery] bool includeRowId = false,
        [FromQuery] string? language = null
    )
    {
        if (string.IsNullOrEmpty(dataType))
        {
            return BadRequest(
                $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter."
            );
        }

        string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

        if (string.IsNullOrEmpty(classRef))
        {
            return BadRequest(
                $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter."
            );
        }

        InstanceOwner? owner = await GetInstanceOwner(partyFromHeader);
        if (owner is null)
        {
            return BadRequest(
                $"Invalid party header. Please provide a party header on the form partyid:123, org:[orgnr] or person:[ssn]"
            );
        }

        Dictionary<string, string>? prefillFromQueryParams = null;

        if (!string.IsNullOrEmpty(prefill))
        {
            prefillFromQueryParams = JsonSerializer.Deserialize<Dictionary<string, string>>(prefill);
            if (prefillFromQueryParams != null)
            {
                IValidateQueryParamPrefill? validateQueryParamPrefill =
                    _appImplementationFactory.Get<IValidateQueryParamPrefill>();
                if (validateQueryParamPrefill is not null)
                {
                    var issue = await validateQueryParamPrefill.PrefillFromQueryParamsIsValid(prefillFromQueryParams);
                    if (issue != null)
                    {
                        return BadRequest(
                            new ProblemDetails()
                            {
                                Title = "Validation error from IValidateQueryParamPrefill",
                                Detail = issue.Description,
                                Status = StatusCodes.Status400BadRequest,
                                Extensions = { ["issue"] = issue },
                            }
                        );
                    }
                }
            }
        }

        EnforcementResult enforcementResult = await AuthorizeAction(
            org,
            app,
            Convert.ToInt32(owner.PartyId, CultureInfo.InvariantCulture),
            "read"
        );

        if (!enforcementResult.Authorized)
        {
            return Forbidden(enforcementResult);
        }

        object appModel = _appModel.Create(classRef);

        // runs prefill from repo configuration if config exists
        await _prefillService.PrefillDataModel(owner.PartyId, dataType, appModel, prefillFromQueryParams);

        Instance virtualInstance = new Instance() { InstanceOwner = owner };
        await ProcessAllDataRead(virtualInstance, appModel, includeRowId, language);

        return Ok(appModel);
    }

    private async Task ProcessAllDataRead(
        Instance virtualInstance,
        object appModel,
        bool includeAltinnRowId,
        string? language
    )
    {
        var dataProcessors = _appImplementationFactory.GetAll<IDataProcessor>();
        foreach (var dataProcessor in dataProcessors)
        {
            _logger.LogInformation(
                "ProcessDataRead for {modelType} using {dataProcesor}",
                appModel.GetType().Name,
                dataProcessor.GetType().Name
            );
            await dataProcessor.ProcessDataRead(virtualInstance, null, appModel, language);
        }

        if (includeAltinnRowId)
        {
            ObjectUtils.InitializeAltinnRowId(appModel);
        }
    }

    /// <summary>
    /// Create a new data object of the defined data type
    /// </summary>
    /// <param name="dataType">The data type id</param>
    /// <param name="includeRowId">Whether to initialize or remove AltinnRowId fields in the model</param>
    /// <param name="language">The language selected by the user.</param>
    /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
    [AllowAnonymous]
    [HttpGet]
    [DisableFormValueModelBinding]
    [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
    [ProducesResponseType(typeof(DataElement), 200)]
    [Route("anonymous")]
    public async Task<ActionResult> GetAnonymous(
        [FromQuery] string dataType,
        [FromQuery] bool includeRowId = false,
        [FromQuery] string? language = null
    )
    {
        if (string.IsNullOrEmpty(dataType))
        {
            return BadRequest(
                $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter."
            );
        }

        string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

        if (string.IsNullOrEmpty(classRef))
        {
            return BadRequest(
                $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter."
            );
        }

        object appModel = _appModel.Create(classRef);
        var virtualInstance = new Instance();
        await ProcessAllDataRead(virtualInstance, appModel, includeRowId, language);

        return Ok(appModel);
    }

    /// <summary>
    /// Create a new data object of the defined data type
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="dataType">The data type id</param>
    /// <param name="partyFromHeader">The party that should be represented with  prefix "partyId:", "person:" or "org:" (eg: "partyId:123")</param>
    /// <param name="includeRowId">Whether to initialize or remove AltinnRowId fields in the model</param>
    /// <param name="language">The language selected by the user.</param>
    /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
    [Authorize]
    [HttpPost]
    [DisableFormValueModelBinding]
    [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
    [ProducesResponseType(typeof(DataElement), 200)]
    public async Task<ActionResult> Post(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] string dataType,
        [FromHeader(Name = "party")] string partyFromHeader,
        [FromQuery] bool includeRowId = false,
        [FromQuery] string? language = null
    )
    {
        if (string.IsNullOrEmpty(dataType))
        {
            return BadRequest(
                $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter."
            );
        }

        string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

        if (string.IsNullOrEmpty(classRef))
        {
            return BadRequest(
                $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter."
            );
        }

        InstanceOwner? owner = await GetInstanceOwner(partyFromHeader);

        if (owner is null)
        {
            return BadRequest($"Invalid party header");
        }

        EnforcementResult enforcementResult = await AuthorizeAction(
            org,
            app,
            Convert.ToInt32(owner.PartyId, CultureInfo.InvariantCulture),
            "read"
        );

        if (!enforcementResult.Authorized)
        {
            return Forbidden(enforcementResult);
        }

        ModelDeserializer deserializer = new ModelDeserializer(_logger, _appModel.GetModelType(classRef));
        object? appModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

        if (!string.IsNullOrEmpty(deserializer.Error) || appModel is null)
        {
            return BadRequest(deserializer.Error);
        }

        // runs prefill from repo configuration if config exists
        await _prefillService.PrefillDataModel(owner.PartyId, dataType, appModel);

        Instance virtualInstance = new Instance() { InstanceOwner = owner };
        await ProcessAllDataRead(virtualInstance, appModel, includeRowId, language);

        return Ok(appModel);
    }

    /// <summary>
    /// Create a new data object of the defined data type
    /// </summary>
    /// <param name="dataType">The data type id</param>
    /// <param name="includeRowId">Whether to initialize or remove AltinnRowId fields in the model</param>
    /// <param name="language">The language selected by the user.</param>
    /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
    [AllowAnonymous]
    [HttpPost]
    [DisableFormValueModelBinding]
    [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
    [ProducesResponseType(typeof(DataElement), 200)]
    [Route("anonymous")]
    public async Task<ActionResult> PostAnonymous(
        [FromQuery] string dataType,
        [FromQuery] bool includeRowId = false,
        [FromQuery] string? language = null
    )
    {
        if (string.IsNullOrEmpty(dataType))
        {
            return BadRequest(
                $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter."
            );
        }

        string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

        if (string.IsNullOrEmpty(classRef))
        {
            return BadRequest(
                $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter."
            );
        }

        ModelDeserializer deserializer = new ModelDeserializer(_logger, _appModel.GetModelType(classRef));
        object? appModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

        if (!string.IsNullOrEmpty(deserializer.Error) || appModel is null)
        {
            return BadRequest(deserializer.Error);
        }

        Instance virtualInstance = new Instance();
        await ProcessAllDataRead(virtualInstance, appModel, includeRowId, language);

        return Ok(appModel);
    }

    private async Task<InstanceOwner?> GetInstanceOwner(string? partyFromHeader)
    {
        // Use the party id of the logged in user, if no party id is given in the header
        // Not sure if this is really used anywhere. It doesn't seem useful, as you'd
        // always want to create an instance based on the selected party, not the person
        // you happened to log in as.
        if (partyFromHeader is null)
        {
            var currentAuth = _authenticationContext.Current;
            Party? party = currentAuth switch
            {
                Authenticated.User auth => await auth.LookupSelectedParty(),
                Authenticated.Org auth => (await auth.LoadDetails()).Party,
                Authenticated.ServiceOwner auth => (await auth.LoadDetails()).Party,
                Authenticated.SystemUser auth => (await auth.LoadDetails()).Party,
                _ => null,
            };

            if (party is null)
                return null;

            return InstantiationHelper.PartyToInstanceOwner(party);
        }
        else
        {
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
                PartyPrefix => await _altinnPartyClient.GetParty(int.TryParse(id, out var partyId) ? partyId : 0),

                // Frontend seems to only use partyId, not orgnr or ssn.
                PersonPrefix => await _altinnPartyClient.LookupParty(new PartyLookup { Ssn = id }),
                OrgPrefix => await _altinnPartyClient.LookupParty(new PartyLookup { OrgNo = id }),
                _ => null,
            };

            if (party is null || party.PartyId == 0)
            {
                return null;
            }

            return InstantiationHelper.PartyToInstanceOwner(party);
        }
    }

    private async Task<EnforcementResult> AuthorizeAction(string org, string app, int partyId, string action)
    {
        EnforcementResult enforcementResult = new EnforcementResult();
        XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(
            org,
            app,
            HttpContext.User,
            action,
            partyId,
            null
        );
        XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

        if (response?.Response == null)
        {
            _logger.LogInformation(
                $"// Instances Controller // Authorization of action {action} failed with request: {JsonSerializer.Serialize(request)}."
            );
            return enforcementResult;
        }

        enforcementResult = DecisionHelper.ValidatePdpDecisionDetailed(response.Response, HttpContext.User);
        return enforcementResult;
    }

    private ActionResult Forbidden(EnforcementResult enforcementResult)
    {
        if (enforcementResult.FailedObligations != null && enforcementResult.FailedObligations.Count > 0)
        {
            return StatusCode(StatusCodes.Status403Forbidden, enforcementResult.FailedObligations);
        }

        return StatusCode(StatusCodes.Status403Forbidden);
    }
}
