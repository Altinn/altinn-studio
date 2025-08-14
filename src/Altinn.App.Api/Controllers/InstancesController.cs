using System.Globalization;
using System.Net;
using System.Text;
using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers.Patch;
using Altinn.App.Api.Helpers.RequestHandling;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Mappers;
using Altinn.App.Api.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Texts;
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

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for application instances for app-backend.
/// You can create a new instance (POST), update it (PUT) and retrieve a specific instance (GET).
/// </summary>
[Authorize]
[AutoValidateAntiforgeryTokenIfAuthCookie]
[Route("{org}/{app}/instances")]
[ApiController]
public class InstancesController : ControllerBase
{
    private readonly ILogger<InstancesController> _logger;

    private readonly IInstanceClient _instanceClient;
    private readonly IDataClient _dataClient;
    private readonly IAltinnPartyClient _altinnPartyClient;
    private readonly IRegisterClient _registerClient;
    private readonly IEventsClient _eventsClient;
    private readonly IProfileClient _profileClient;

    private readonly IAppMetadata _appMetadata;
    private readonly IAppModel _appModel;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IPDP _pdp;
    private readonly IPrefill _prefillService;
    private readonly AppSettings _appSettings;
    private readonly IProcessEngine _processEngine;
    private readonly IOrganizationClient _orgClient;
    private readonly IHostEnvironment _env;
    private readonly ModelSerializationService _serializationService;
    private readonly InternalPatchService _patchService;
    private readonly ITranslationService _translationService;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;
    private const long RequestSizeLimit = 2000 * 1024 * 1024;

    /// <summary>
    /// Initializes a new instance of the <see cref="InstancesController"/> class
    /// </summary>
    public InstancesController(
        ILogger<InstancesController> logger,
        IAltinnPartyClient altinnPartyClient,
        IInstanceClient instanceClient,
        IDataClient dataClient,
        IAppMetadata appMetadata,
        IAppModel appModel,
        IAuthenticationContext authenticationContext,
        IPDP pdp,
        IEventsClient eventsClient,
        IOptions<AppSettings> appSettings,
        IPrefill prefillService,
        IProfileClient profileClient,
        IProcessEngine processEngine,
        IOrganizationClient orgClient,
        IHostEnvironment env,
        ModelSerializationService serializationService,
        InternalPatchService patchService,
        ITranslationService translationService,
        IServiceProvider serviceProvider
    )
    {
        _logger = logger;
        _instanceClient = instanceClient;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _altinnPartyClient = altinnPartyClient;
        _registerClient = serviceProvider.GetRequiredService<IRegisterClient>();
        _appModel = appModel;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _pdp = pdp;
        _eventsClient = eventsClient;
        _appSettings = appSettings.Value;
        _prefillService = prefillService;
        _profileClient = profileClient;
        _processEngine = processEngine;
        _orgClient = orgClient;
        _env = env;
        _serializationService = serializationService;
        _patchService = patchService;
        _translationService = translationService;
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        _authenticationContext = authenticationContext;
        _dataElementAccessChecker = serviceProvider.GetRequiredService<IDataElementAccessChecker>();
    }

    /// <summary>
    ///  Gets an instance object from storage.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="cancellationToken">cancellation token</param>
    /// <returns>the instance</returns>
    [Authorize]
    [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(InstanceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> Get(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        EnforcementResult enforcementResult = await AuthorizeAction(
            org,
            app,
            instanceOwnerPartyId,
            instanceGuid,
            "read"
        );

        if (!enforcementResult.Authorized)
        {
            return Forbidden(enforcementResult);
        }

        try
        {
            Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

            string? userOrgClaim = User.GetOrg();

            if (userOrgClaim == null || !org.Equals(userOrgClaim, StringComparison.OrdinalIgnoreCase))
            {
                await _instanceClient.UpdateReadStatus(instanceOwnerPartyId, instanceGuid, "read");
            }

            var instanceOwnerParty = await _registerClient.GetPartyUnchecked(instanceOwnerPartyId, cancellationToken);

            var dto = InstanceResponse.From(
                await instance.WithOnlyAccessibleDataElements(_dataElementAccessChecker),
                instanceOwnerParty
            );

            return Ok(dto);
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
    /// <param name="language">The currently active user language</param>
    /// <returns>the created instance</returns>
    [HttpPost]
    [DisableFormValueModelBinding]
    [Produces("application/json")]
    [ProducesResponseType(typeof(InstanceResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(RequestSizeLimit)]
    public async Task<ActionResult<InstanceResponse>> Post(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] int? instanceOwnerPartyId,
        [FromQuery] string? language = null
    )
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
        if (VerifyInstantiationPermissions(application, org, app) is { } verificationResult)
            return verificationResult;

        var readResult = await MultipartRequestReader.Read(Request);

        if (!readResult.Success)
        {
            return StatusCode(readResult.Error.Status ?? 500, readResult.Error);
        }

        var requestParts = readResult.Ok;

        Instance? instanceTemplate = ExtractInstanceTemplate(requestParts);

        if (instanceOwnerPartyId is null && instanceTemplate is null)
        {
            return BadRequest(
                "Cannot create an instance without an instanceOwner.partyId. Either provide instanceOwner party Id as a query parameter or an instanceTemplate object in the body."
            );
        }

        if (instanceOwnerPartyId is not null && instanceTemplate?.InstanceOwner?.PartyId is not null)
        {
            return BadRequest(
                "You cannot provide an instanceOwnerPartyId as a query param as well as an instance template in the body. Choose one or the other."
            );
        }

        if (instanceTemplate is not null)
        {
            InstanceOwner lookup = instanceTemplate.InstanceOwner;

            if (
                lookup == null
                || (lookup.PersonNumber == null && lookup.OrganisationNumber == null && lookup.PartyId == null)
            )
            {
                return BadRequest(
                    "Error: instanceOwnerPartyId query parameter is empty and InstanceOwner is missing from instance template. You must populate instanceOwnerPartyId or InstanceOwner"
                );
            }
        }
        else
        {
            if (instanceOwnerPartyId is null)
            {
                return StatusCode(500, "Can't create minimal instance when Instance owner Party ID is null");
            }

            // create minimum instance template
            instanceTemplate = new Instance
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = instanceOwnerPartyId.Value.ToString(CultureInfo.InvariantCulture),
                },
            };
        }

        RequestPartValidator requestValidator = new(application);
        string? multipartError = requestValidator.ValidateParts(requestParts);

        if (!string.IsNullOrEmpty(multipartError))
        {
            return BadRequest($"Error when comparing content to application metadata: {multipartError}");
        }

        Party party;
        try
        {
            party = await LookupParty(instanceTemplate.InstanceOwner) ?? throw new Exception("Unknown party");
            instanceTemplate.InstanceOwner = InstantiationHelper.PartyToInstanceOwner(party);
        }
        catch (Exception partyLookupException)
        {
            if (partyLookupException is ServiceException sexp)
            {
                if (sexp.StatusCode.Equals(HttpStatusCode.Unauthorized))
                {
                    return StatusCode(StatusCodes.Status403Forbidden);
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
            return StatusCode(
                StatusCodes.Status403Forbidden,
                $"Party {party.PartyId} is not allowed to instantiate this application {org}/{app}"
            );
        }

        // Run custom app logic to validate instantiation
        var instantiationValidator = _appImplementationFactory.GetRequired<IInstantiationValidator>();
        InstantiationValidationResult? validationResult = await instantiationValidator.Validate(instanceTemplate);
        if (validationResult != null && !validationResult.Valid)
        {
            await TranslateValidationResult(validationResult, language);
            return StatusCode(StatusCodes.Status403Forbidden, validationResult);
        }

        instanceTemplate.Org = application.Org;
        ConditionallySetReadStatus(instanceTemplate);

        Instance instance;
        instanceTemplate.Process = null;
        ProcessStateChange? change = null;

        try
        {
            // start process and goto next task
            ProcessStartRequest processStartRequest = new() { Instance = instanceTemplate, User = User };

            ProcessChangeResult result = await _processEngine.GenerateProcessStartEvents(processStartRequest);
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
            return ExceptionResponse(
                exception,
                $"Instantiation of appId {org}/{app} failed for party {instanceTemplate.InstanceOwner?.PartyId}"
            );
        }

        try
        {
            var prefillProblem = await StorePrefillParts(instance, application, requestParts, language);
            if (prefillProblem is not null)
            {
                await _instanceClient.DeleteInstance(
                    int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture),
                    Guid.Parse(instance.Id.Split("/")[1]),
                    hard: true
                );
                return StatusCode(prefillProblem.Status ?? 500, prefillProblem);
            }

            // get the updated instance
            instance = await _instanceClient.GetInstance(
                app,
                org,
                int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture),
                Guid.Parse(instance.Id.Split("/")[1])
            );

            // notify app and store events
            _logger.LogInformation("Events sent to process engine: {Events}", change?.Events);
            await _processEngine.HandleEventsAndUpdateStorage(instance, null, change?.Events);
        }
        catch (Exception exception)
        {
            return ExceptionResponse(
                exception,
                $"Instantiation of data elements failed for instance {instance.Id} for party {instanceTemplate.InstanceOwner?.PartyId}"
            );
        }

        await RegisterEvent("app.instance.created", instance);

        SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);
        string url = instance.SelfLinks.Apps;

        var dto = InstanceResponse.From(
            await instance.WithOnlyAccessibleDataElements(_dataElementAccessChecker),
            party
        );

        return Created(url, dto);
    }

    private ObjectResult? VerifyInstantiationPermissions(
        ApplicationMetadata application,
        string org,
        string app,
        bool isCopy = false
    )
    {
        if (_env.IsProduction() && application.DisallowUserInstantiation)
        {
            var orgClaimIsValid = !string.IsNullOrWhiteSpace(User.GetOrg());

            if (orgClaimIsValid || isCopy)
                return null;

            return StatusCode(
                StatusCodes.Status403Forbidden,
                $"User instantiation is disabled for this application {org}/{app}"
            );
        }

        return null;
    }

    /// <summary>
    /// Simplified Instanciation with support for fieldprefill
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instansiationInstance">instansiation information</param>
    /// <param name="language">The currently active user language</param>
    /// <returns>The new instance</returns>
    [HttpPost("create")]
    [DisableFormValueModelBinding]
    [Produces("application/json")]
    [ProducesResponseType(typeof(InstanceResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(RequestSizeLimit)]
    public async Task<ActionResult<InstanceResponse>> PostSimplified(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromBody] InstansiationInstance instansiationInstance,
        [FromQuery] string? language = null
    )
    {
        if (string.IsNullOrEmpty(org))
        {
            return BadRequest("The path parameter 'org' cannot be empty");
        }

        if (string.IsNullOrEmpty(app))
        {
            return BadRequest("The path parameter 'app' cannot be empty");
        }

        bool isCopyRequest = !string.IsNullOrEmpty(instansiationInstance.SourceInstanceId);

        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        if (VerifyInstantiationPermissions(application, org, app, isCopy: isCopyRequest) is { } verificationResult)
            return verificationResult;

        var copyInstanceEnabled = application.CopyInstanceSettings?.Enabled is true;

        if (isCopyRequest && !copyInstanceEnabled)
        {
            return BadRequest(
                "Creating instance based on a copy from an archived instance is not enabled for this app."
            );
        }

        InstanceOwner lookup = instansiationInstance.InstanceOwner;

        if (
            lookup == null
            || (lookup.PersonNumber == null && lookup.OrganisationNumber == null && lookup.PartyId == null)
        )
        {
            return BadRequest(
                "Error: instanceOwnerPartyId query parameter is empty and InstanceOwner is missing from instance template. You must populate instanceOwnerPartyId or InstanceOwner"
            );
        }

        Party party;
        try
        {
            party = await LookupParty(instansiationInstance.InstanceOwner) ?? throw new Exception("Unknown party");
            instansiationInstance.InstanceOwner = InstantiationHelper.PartyToInstanceOwner(party);
        }
        catch (Exception partyLookupException)
        {
            if (partyLookupException is ServiceException sexp)
            {
                if (sexp.StatusCode.Equals(HttpStatusCode.Unauthorized))
                {
                    return StatusCode(StatusCodes.Status403Forbidden);
                }
            }

            return NotFound($"Cannot lookup party: {partyLookupException.Message}");
        }

        if (
            isCopyRequest
            && party.PartyId.ToString(CultureInfo.InvariantCulture)
                != instansiationInstance.SourceInstanceId.Split("/")[0]
        )
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
            return StatusCode(
                StatusCodes.Status403Forbidden,
                $"Party {party.PartyId} is not allowed to instantiate this application {org}/{app}"
            );
        }

        Instance instanceTemplate = new()
        {
            InstanceOwner = instansiationInstance.InstanceOwner,
            VisibleAfter = instansiationInstance.VisibleAfter,
            DueBefore = instansiationInstance.DueBefore,
            Org = application.Org,
        };

        ConditionallySetReadStatus(instanceTemplate);

        // Run custom app logic to validate instantiation
        var instantiationValidator = _appImplementationFactory.GetRequired<IInstantiationValidator>();
        InstantiationValidationResult? validationResult = await instantiationValidator.Validate(instanceTemplate);
        if (validationResult != null && !validationResult.Valid)
        {
            await TranslateValidationResult(validationResult, language);
            return StatusCode(StatusCodes.Status403Forbidden, validationResult);
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
                Prefill = instansiationInstance.Prefill,
            };

            processResult = await _processEngine.GenerateProcessStartEvents(request);

            Instance? source = null;

            if (isCopyRequest)
            {
                string[] sourceSplit = instansiationInstance.SourceInstanceId.Split("/");
                Guid sourceInstanceGuid = Guid.Parse(sourceSplit[1]);

                try
                {
                    source = await _instanceClient.GetInstance(app, org, party.PartyId, sourceInstanceGuid);
                }
                catch (PlatformHttpException exception)
                {
                    return StatusCode(
                        500,
                        $"Retrieving source instance failed with status code {exception.Response.StatusCode}"
                    );
                }

                if (source.Status?.IsArchived is not true)
                {
                    return BadRequest("It is not possible to copy an instance that isn't archived.");
                }
            }

            instance = await _instanceClient.CreateInstance(org, app, instanceTemplate);

            if (isCopyRequest && source is not null)
            {
                await CopyDataFromSourceInstance(application, instance, source);
            }

            instance = await _instanceClient.GetInstance(instance);
            await _processEngine.HandleEventsAndUpdateStorage(
                instance,
                instansiationInstance.Prefill,
                processResult.ProcessStateChange?.Events
            );
        }
        catch (Exception exception)
        {
            return ExceptionResponse(
                exception,
                $"Instantiation of appId {org}/{app} failed for party {instanceTemplate.InstanceOwner?.PartyId}"
            );
        }

        await RegisterEvent("app.instance.created", instance);

        SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);
        string url = instance.SelfLinks.Apps;

        var dto = InstanceResponse.From(instance, party);

        return Created(url, dto);
    }

    /// <summary>
    /// This method handles the copy endpoint for when a user wants to create a copy of an existing instance.
    /// The endpoint will primarily be accessed directly by a user clicking the copy button for an archived instance
    /// from the message box in the Altinn 2 portal/Altinn 3 arbeidsflate.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app</param>
    /// <param name="app">Application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">Unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">Unique id to identify the instance</param>
    /// <param name="language">The currently active user language</param>
    /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
    /// <remarks>
    /// The endpoint will return a redirect to the new instance if the copy operation was successful.
    /// </remarks>
    [ApiExplorerSettings(IgnoreApi = true)]
    [Authorize]
    // The URL contains "legacy", but it is not really legacy.
    // Originally it was thought of as tech debt to do mutation like this in a GET endpoint,
    // but after further consideration, it was decided to keep it as is.
    // A related topic is the fact that Altinn tokens are "global" and not scoped to a specific app.
    // Since it now would be a breaking change to rename or remove, it still has "legacy" as part of the name.
    [HttpGet("/{org}/{app}/legacy/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/copy")]
    [ProducesResponseType(typeof(Instance), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> CopyInstance(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? language = null
    )
    {
        // This endpoint should be used exclusively by end users. Ideally from a browser as a request after clicking
        // a button in the message box.
        var auth = _authenticationContext.Current;
        if (auth is not Authenticated.User)
        {
            return Forbid();
        }

        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();

        if (application.CopyInstanceSettings?.Enabled is null or false)
        {
            return BadRequest(
                "Creating instance based on a copy from an archived instance is not enabled for this app."
            );
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

        EnforcementResult instantiateAccess = await AuthorizeAction(
            org,
            app,
            instanceOwnerPartyId,
            null,
            "instantiate"
        );

        if (!instantiateAccess.Authorized)
        {
            return Forbidden(instantiateAccess);
        }

        // Multiple properties like Org and AppId will be set by Storage
        Instance targetInstance = new()
        {
            InstanceOwner = sourceInstance.InstanceOwner,
            VisibleAfter = sourceInstance.VisibleAfter,
            Status = new() { ReadStatus = ReadStatus.Read },
        };

        var instantiationValidator = _appImplementationFactory.GetRequired<IInstantiationValidator>();
        InstantiationValidationResult? validationResult = await instantiationValidator.Validate(targetInstance);
        if (validationResult != null && !validationResult.Valid)
        {
            await TranslateValidationResult(validationResult, language);
            return StatusCode(StatusCodes.Status403Forbidden, validationResult);
        }

        ProcessStartRequest processStartRequest = new() { Instance = targetInstance, User = User };

        ProcessChangeResult startResult = await _processEngine.GenerateProcessStartEvents(processStartRequest);

        targetInstance = await _instanceClient.CreateInstance(org, app, targetInstance);

        await CopyDataFromSourceInstance(application, targetInstance, sourceInstance);

        targetInstance = await _instanceClient.GetInstance(targetInstance);

        await _processEngine.HandleEventsAndUpdateStorage(targetInstance, null, startResult.ProcessStateChange?.Events);

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
        [FromRoute] Guid instanceGuid
    )
    {
        try
        {
            Instance instance = await _instanceClient.AddCompleteConfirmation(instanceOwnerPartyId, instanceGuid);
            SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

            return Ok(instance);
        }
        catch (Exception exception)
        {
            return ExceptionResponse(
                exception,
                $"Adding complete confirmation to instance {instanceOwnerPartyId}/{instanceGuid} failed"
            );
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
        [FromBody] Substatus substatus
    )
    {
        if (substatus == null || string.IsNullOrEmpty(substatus.Label))
        {
            return BadRequest(
                $"Invalid sub status: {JsonConvert.SerializeObject(substatus)}. Substatus must be defined and include a label."
            );
        }

        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

        string? orgClaim = User.GetOrg();
        if (!instance.Org.Equals(orgClaim, StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        try
        {
            Instance updatedInstance = await _instanceClient.UpdateSubstatus(
                instanceOwnerPartyId,
                instanceGuid,
                substatus
            );
            SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

            await RegisterEvent("app.instance.substatus.changed", instance);

            return Ok(updatedInstance);
        }
        catch (Exception exception)
        {
            return ExceptionResponse(
                exception,
                $"Updating substatus for instance {instanceOwnerPartyId}/{instanceGuid} failed."
            );
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
        [FromQuery] bool hard
    )
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
    public async Task<ActionResult<List<SimpleInstance>>> GetActiveInstances(
        [FromRoute] string org,
        [FromRoute] string app,
        int instanceOwnerPartyId
    )
    {
        Dictionary<string, StringValues> queryParams = new()
        {
            { "appId", $"{org}/{app}" },
            { "instanceOwner.partyId", instanceOwnerPartyId.ToString(CultureInfo.InvariantCulture) },
            { "status.isArchived", "false" },
            { "status.isSoftDeleted", "false" },
        };

        List<Instance> activeInstances = await _instanceClient.GetInstances(queryParams);

        if (activeInstances.Count == 0)
        {
            return Ok(new List<SimpleInstance>());
        }

        var lastChangedByValues = activeInstances.Select(i => i.LastChangedBy).Distinct();

        Dictionary<string, string> userAndOrgLookup = new Dictionary<string, string>();

        foreach (string lastChangedBy in lastChangedByValues)
        {
            if (lastChangedBy?.Length == 9)
            {
                Organization? organization = await _orgClient.GetOrganization(lastChangedBy);
                if (organization is not null && !string.IsNullOrEmpty(organization.Name))
                {
                    userAndOrgLookup.Add(lastChangedBy, organization.Name);
                }
            }
            else if (int.TryParse(lastChangedBy, out int lastChangedByInt))
            {
                UserProfile? user = await _profileClient.GetUserProfile(lastChangedByInt);
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
        var isInstantiatedByOrg = User.GetOrg() is not null;

        if (isInstantiatedByOrg)
        {
            // Default value for ReadStatus is "not read"
            return;
        }

        instance.Status ??= new InstanceStatus();
        instance.Status.ReadStatus = ReadStatus.Read;
    }

    private async Task CopyDataFromSourceInstance(
        ApplicationMetadata application,
        Instance targetInstance,
        Instance sourceInstance
    )
    {
        string org = application.Org;
        string app = application.AppIdentifier.App;
        int instanceOwnerPartyId = int.Parse(targetInstance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);

        string[] sourceSplit = sourceInstance.Id.Split("/");
        Guid sourceInstanceGuid = Guid.Parse(sourceSplit[1]);

        List<DataType> dts = application
            .DataTypes.Where(dt => dt.AppLogic?.ClassRef != null)
            .Where(dt =>
                dt.TaskId != null
                && dt.TaskId.Equals(targetInstance.Process.CurrentTask.ElementId, StringComparison.Ordinal)
            )
            .ToList();
        List<string> excludedDataTypes = application.CopyInstanceSettings.ExcludedDataTypes;

        foreach (DataElement de in sourceInstance.Data)
        {
            if (excludedDataTypes != null && excludedDataTypes.Contains(de.DataType))
            {
                continue;
            }

            if (dts.Any(dts => dts.Id.Equals(de.DataType, StringComparison.Ordinal)))
            {
                DataType dt = dts.First(dt => dt.Id.Equals(de.DataType, StringComparison.Ordinal));

                Type type;
                try
                {
                    type = _appModel.GetModelType(dt.AppLogic.ClassRef);
                }
                catch (Exception altinnAppException)
                {
                    throw new ServiceException(
                        HttpStatusCode.InternalServerError,
                        $"App.GetAppModelType failed: {altinnAppException.Message}",
                        altinnAppException
                    );
                }

                object data = await _dataClient.GetFormData(
                    sourceInstanceGuid,
                    type,
                    org,
                    app,
                    instanceOwnerPartyId,
                    Guid.Parse(de.Id)
                );

                if (application.CopyInstanceSettings.ExcludedDataFields != null)
                {
                    DataHelper.ResetDataFields(application.CopyInstanceSettings.ExcludedDataFields, data);
                }

                await _prefillService.PrefillDataModel(
                    instanceOwnerPartyId.ToString(CultureInfo.InvariantCulture),
                    dt.Id,
                    data
                );

                var instantiationProcessor = _appImplementationFactory.GetRequired<IInstantiationProcessor>();
                await instantiationProcessor.DataCreation(targetInstance, data, null);

                ObjectUtils.InitializeAltinnRowId(data);

                await _dataClient.InsertFormData(
                    data,
                    Guid.Parse(targetInstance.Id.Split("/")[1]),
                    type,
                    org,
                    app,
                    instanceOwnerPartyId,
                    dt.Id
                );

                await UpdatePresentationTextsOnInstance(application.PresentationFields, targetInstance, dt.Id, data);
                await UpdateDataValuesOnInstance(application.DataFields, targetInstance, dt.Id, data);
            }
        }

        if (application.CopyInstanceSettings?.IncludeAttachments != true)
        {
            return;
        }

        // Copy binary data elements (files/attachments)
        // Error handling strategy: Continue processing other attachments even if individual ones fail
        // This ensures partial success rather than complete failure when some attachments cannot be copied
        List<DataType> binaryDataTypes = application
            .DataTypes.Where(dt => dt.AppLogic?.ClassRef == null)
            .Where(dt =>
                dt.TaskId != null
                && dt.TaskId.Equals(targetInstance.Process.CurrentTask.ElementId, StringComparison.Ordinal)
            )
            .ToList();

        foreach (DataElement de in sourceInstance.Data)
        {
            if (excludedDataTypes != null && excludedDataTypes.Contains(de.DataType))
            {
                continue;
            }

            if (binaryDataTypes.Any(dt => dt.Id.Equals(de.DataType, StringComparison.Ordinal)))
            {
                using var binaryDataStream = await _dataClient.GetBinaryData(
                    org,
                    app,
                    instanceOwnerPartyId,
                    sourceInstanceGuid,
                    Guid.Parse(de.Id)
                );

                await _dataClient.InsertBinaryData(
                    targetInstance.Id,
                    de.DataType,
                    de.ContentType,
                    de.Filename,
                    binaryDataStream
                );
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

    private async Task<EnforcementResult> AuthorizeAction(
        string org,
        string app,
        int partyId,
        Guid? instanceGuid,
        string action
    )
    {
        EnforcementResult enforcementResult = new EnforcementResult();
        XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(
            org,
            app,
            HttpContext.User,
            action,
            partyId,
            instanceGuid
        );
        XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

        if (response?.Response == null)
        {
            string serializedRequest = JsonConvert.SerializeObject(request);
            _logger.LogInformation(
                "// Instances Controller // Authorization of action {action} failed with request: {serializedRequest}.",
                action,
                serializedRequest
            );
            return enforcementResult;
        }

        enforcementResult = DecisionHelper.ValidatePdpDecisionDetailed(response.Response, HttpContext.User);
        return enforcementResult;
    }

    private async Task<Party?> LookupParty(InstanceOwner instanceOwner)
    {
        if (instanceOwner.PartyId != null)
        {
            try
            {
                return await _registerClient.GetPartyUnchecked(
                    int.Parse(instanceOwner.PartyId, CultureInfo.InvariantCulture),
                    this.HttpContext.RequestAborted
                );
            }
            catch (Exception e) when (e is not ServiceException)
            {
                _logger.LogWarning(e, "Failed to lookup party by partyId: {partyId}", instanceOwner.PartyId);
                throw new ServiceException(
                    HttpStatusCode.BadRequest,
                    $"Failed to lookup party by partyId: {instanceOwner.PartyId}. The exception was: {e.Message}",
                    e
                );
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
                    return await _altinnPartyClient.LookupParty(new PartyLookup { Ssn = instanceOwner.PersonNumber });
                }
                else if (!string.IsNullOrEmpty(instanceOwner.OrganisationNumber))
                {
                    lookupNumber = "organisationNumber";
                    return await _altinnPartyClient.LookupParty(
                        new PartyLookup { OrgNo = instanceOwner.OrganisationNumber }
                    );
                }
                else
                {
                    throw new ServiceException(
                        HttpStatusCode.BadRequest,
                        "Neither personNumber or organisationNumber has value in instanceOwner"
                    );
                }
            }
            catch (Exception e)
            {
                _logger.LogWarning(
                    e,
                    "Failed to lookup party by {lookupNumber}: {personOrOrganisationNumber}",
                    lookupNumber,
                    personOrOrganisationNumber
                );
                throw new ServiceException(
                    HttpStatusCode.BadRequest,
                    $"Failed to lookup party by {lookupNumber}: {personOrOrganisationNumber}. The exception was: {e.Message}",
                    e
                );
            }
        }
    }

    private async Task<ProblemDetails?> StorePrefillParts(
        Instance instance,
        ApplicationMetadata appInfo,
        List<RequestPart> parts,
        string? language
    )
    {
        var dataMutator = await _instanceDataUnitOfWorkInitializer.Init(instance, taskId: null, language);

        for (int partIndex = 0; partIndex < parts.Count; partIndex++)
        {
            RequestPart part = parts[partIndex];
            // NOTE: part.Name is nullable on the type here, but `RequestPartValidator.ValidatePart` which is called
            // further up the stack will error out if it actually null, so we just sanity-check here
            // and throw if it is null.
            // TODO: improve the modelling of this type.
            if (part.Name is null)
            {
                throw new InvalidOperationException("Unexpected state - part name is null");
            }

            DataType? dataType = appInfo.DataTypes.Find(d => d.Id == part.Name);

            if (dataType == null)
            {
                return new ProblemDetails
                {
                    Title = "Data type not found",
                    Detail =
                        $"Data type with id {part.Name} from request part {partIndex} not found in application metadata",
                };
            }

            if (dataType.AppLogic?.ClassRef != null)
            {
                _logger.LogInformation("Storing part {partName}", part.Name);
                var deserializationResult = await _serializationService.DeserializeSingleFromStream(
                    new MemoryAsStream(part.Bytes),
                    part.ContentType,
                    dataType
                );
                if (!deserializationResult.Success)
                {
                    return deserializationResult.Error;
                }

                var data = deserializationResult.Ok;

                await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, part.Name, data);

                var instantiationProcessor = _appImplementationFactory.GetRequired<IInstantiationProcessor>();
                await instantiationProcessor.DataCreation(instance, data, null);

                dataMutator.AddFormDataElement(dataType.Id, data);
            }
            else
            {
                _logger.LogInformation("Storing part {partName}", part.Name);
                dataMutator.AddBinaryDataElement(dataType.Id, part.ContentType, part.FileName, part.Bytes);
            }
        }

        var taskId = instance.Process?.CurrentTask?.ElementId;

        if (taskId is null)
            throw new InvalidOperationException("There should be a task while initializing data");

        var changes = dataMutator.GetDataElementChanges(initializeAltinnRowId: true);
        await _patchService.RunDataProcessors(dataMutator, changes, taskId, language);

        if (dataMutator.GetAbandonResponse() is { } abandonResponse)
        {
            _logger.LogWarning(
                "Data processing failed for one or more data elements, the instance was created, but we try to delete the instance"
            );
            return abandonResponse;
        }

        // Update the changes list if it changed in data processors
        changes = dataMutator.GetDataElementChanges(initializeAltinnRowId: true);
        await dataMutator.UpdateInstanceData(changes);
        await dataMutator.SaveChanges(changes);

        return null;
    }

    /// <summary>
    /// Extracts the instance template from a multipart reader, which contains a number of parts. If the reader contains
    /// only one part and it has no name and contentType application/json it is assumed to be an instance template.
    ///
    /// If found the method removes the part corresponding to the instance template form the parts list.
    /// </summary>
    /// <param name="parts">the parts of the multipart request</param>
    /// <returns>the instance template or null if none is found</returns>
    private static Instance? ExtractInstanceTemplate(List<RequestPart> parts)
    {
        RequestPart? instancePart = parts.Find(part => part.Name == "instance");

        // If the request has a single part with no name, assume it is the instance template
        if (instancePart == null && parts.Count == 1 && parts[0].Name == null)
        {
            instancePart = parts[0];
        }

        if (instancePart != null)
        {
            parts.Remove(instancePart);

            // Some clients might set contentType to application/json even if the body is empty
            if (
                instancePart is { Bytes.Length: > 0 }
                && instancePart.ContentType.Contains("application/json", StringComparison.Ordinal)
            )
            {
                return JsonConvert.DeserializeObject<Instance>(Encoding.UTF8.GetString(instancePart.Bytes));
            }
        }

        return null;
    }

    private async Task RegisterEvent(string eventType, Instance instance)
    {
        if (_appSettings.RegisterEventsWithEventsComponent)
        {
            try
            {
                await _eventsClient.AddEvent(eventType, instance);
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
            return StatusCode(StatusCodes.Status403Forbidden, enforcementResult.FailedObligations);
        }

        return StatusCode(StatusCodes.Status403Forbidden);
    }

    private async Task UpdatePresentationTextsOnInstance(
        List<DataField> presentationFields,
        Instance instance,
        string dataType,
        object data
    )
    {
        var updatedValues = DataHelper.GetUpdatedDataValues(
            presentationFields,
            instance.PresentationTexts,
            dataType,
            data
        );

        if (updatedValues.Count > 0)
        {
            await _instanceClient.UpdatePresentationTexts(
                int.Parse(instance.Id.Split("/")[0], CultureInfo.InvariantCulture),
                Guid.Parse(instance.Id.Split("/")[1]),
                new PresentationTexts { Texts = updatedValues }
            );
        }
    }

    private async Task UpdateDataValuesOnInstance(
        List<DataField> dataFields,
        Instance instance,
        string dataType,
        object data
    )
    {
        var updatedValues = DataHelper.GetUpdatedDataValues(dataFields, instance.DataValues, dataType, data);

        if (updatedValues.Count > 0)
        {
            await _instanceClient.UpdateDataValues(
                int.Parse(instance.Id.Split("/")[0], CultureInfo.InvariantCulture),
                Guid.Parse(instance.Id.Split("/")[1]),
                new DataValues { Values = updatedValues }
            );
        }
    }

    private async Task TranslateValidationResult(InstantiationValidationResult validationResult, string? language)
    {
        if (String.IsNullOrEmpty(validationResult.Message) && !String.IsNullOrEmpty(validationResult.CustomTextKey))
        {
            if (
                await _translationService.TranslateTextKey(
                    validationResult.CustomTextKey,
                    language,
                    validationResult.CustomTextParameters
                )
                is string translated
            )
            {
                validationResult.Message = translated;
            }
        }
    }
}
