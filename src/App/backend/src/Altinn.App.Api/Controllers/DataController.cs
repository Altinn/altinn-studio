using System.Globalization;
using System.Net;
using System.Text.Json;
using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers.Patch;
using Altinn.App.Api.Helpers.RequestHandling;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.FileAnalyzis;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Result;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Microsoft.FeatureManagement;
using Microsoft.Net.Http.Headers;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// The data controller handles creation, update, validation and calculation of data elements.
/// </summary>
[AutoValidateAntiforgeryTokenIfAuthCookie]
[ApiController]
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data")]
public class DataController : ControllerBase
{
    private readonly ILogger<DataController> _logger;
    private readonly IDataClient _dataClient;
    private readonly IInstanceClient _instanceClient;
    private readonly IAppModel _appModel;
    private readonly IAppMetadata _appMetadata;
    private readonly IPrefill _prefillService;
    private readonly IFileAnalysisService _fileAnalyserService;
    private readonly IFileValidationService _fileValidationService;
    private readonly IFeatureManager _featureManager;
    private readonly InternalPatchService _patchService;
    private readonly ModelSerializationService _modelDeserializer;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;

    private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

    /// <summary>
    /// The data controller is responsible for adding business logic to the data elements.
    /// </summary>
    public DataController(
        ILogger<DataController> logger,
        IInstanceClient instanceClient,
        IDataClient dataClient,
        IAppModel appModel,
        IPrefill prefillService,
        IFileAnalysisService fileAnalyserService,
        IFileValidationService fileValidationService,
        IAppMetadata appMetadata,
        IFeatureManager featureManager,
        InternalPatchService patchService,
        ModelSerializationService modelDeserializer,
        IAuthenticationContext authenticationContext,
        IServiceProvider serviceProvider
    )
    {
        _logger = logger;

        _instanceClient = instanceClient;
        _dataClient = dataClient;
        _appModel = appModel;
        _appMetadata = appMetadata;
        _prefillService = prefillService;
        _fileAnalyserService = fileAnalyserService;
        _fileValidationService = fileValidationService;
        _featureManager = featureManager;
        _patchService = patchService;
        _modelDeserializer = modelDeserializer;
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        _authenticationContext = authenticationContext;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _dataElementAccessChecker = serviceProvider.GetRequiredService<IDataElementAccessChecker>();
    }

    /// <summary>
    /// Creates and instantiates a data element of a given element-type. Clients can upload the data element in the request content.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="dataType">identifies the data element type to create</param>
    /// <returns>A Created response with the DataElement or a BadRequest with a list of issues</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPost]
    [DisableFormValueModelBinding]
    [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
    [ProducesResponseType(typeof(DataElement), 201)]
    [Obsolete(
        "Use the POST method with the dataType parameter in url instead, to get more sensible BadRequests when validation fails."
    )]
    public async Task<ActionResult> Create(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string dataType
    )
    {
        var response = await PostImpl(
            org,
            app,
            instanceOwnerPartyId,
            instanceGuid,
            dataType,
            ignoredValidatorsString: null,
            language: null
        );
        if (response.Success)
        {
            var dataElement =
                response.Ok.Instance.Data.Find(d => Guid.Parse(d.Id) == response.Ok.NewDataElementId)
                ?? throw new InvalidOperationException("Data element not found in instance after creation");
            return Created(dataElement.SelfLinks.Apps, dataElement);
        }

        // Special case for compatibility with old clients
        if (response.Error is DataPostErrorResponse fileValidationError)
        {
            return BadRequest(await GetErrorDetails(fileValidationError.UploadValidationIssues));
        }
        if (response.Error.Status == StatusCodes.Status400BadRequest)
        {
            // Old clients will expect BadRequest to have a list of issues or a string
            // not problem details.
            return BadRequest(
                await GetErrorDetails(
                    [
                        new ValidationIssueWithSource
                        {
                            Description = response.Error.Detail,
                            Code = response.Error.Title,
                            Severity = ValidationIssueSeverity.Error,
                            Source = response.Error.Type ?? "DataController",
                        },
                    ]
                )
            );
        }

        return Problem(response.Error);
    }

    /// <summary>
    /// Creates and instantiates a data element of a given element-type. Clients can upload the data element in the request content.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="dataType">identifies the data element type to create</param>
    /// <param name="ignoredValidators">comma separated string of validators to ignore</param>
    /// <param name="language">The currently active user language</param>
    /// <returns>DataPostResponse on success and an extended problemDetails with validation issues if upload validation fails</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPost("type/{dataType}")] // Alias to comply with openApi restrictiokns
    [HttpPost("{dataType}")] // Api for backwards compatibility
    [DisableFormValueModelBinding]
    [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
    [ProducesResponseType(typeof(DataPostResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(DataPostErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DataPostResponse>> Post(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string dataType,
        [FromQuery] string? ignoredValidators = null,
        [FromQuery] string? language = null
    )
    {
        var response = await PostImpl(
            org,
            app,
            instanceOwnerPartyId,
            instanceGuid,
            dataType,
            ignoredValidators,
            language
        );
        if (response.Success)
        {
            return response.Ok;
        }

        return Problem(response.Error);
    }

    private async Task<ServiceResult<DataPostResponse, ProblemDetails>> PostImpl(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string dataTypeString,
        string? ignoredValidatorsString,
        string? language
    )
    {
        try
        {
            var instanceResult = await GetInstanceDataOrError(
                org,
                app,
                instanceOwnerPartyId,
                instanceGuid,
                dataTypeString
            );
            if (!instanceResult.Success)
            {
                return instanceResult.Error;
            }

            var (instance, dataType, _) = instanceResult.Ok;

            if (
                await _dataElementAccessChecker.GetCreateProblem(instance, dataType, _authenticationContext.Current) is
                { } accessProblem
            )
            {
                return accessProblem;
            }

            var taskId = instance.Process?.CurrentTask?.ElementId;
            if (taskId is null)
            {
                return new ProblemDetails()
                {
                    Title = "No current task",
                    Detail = "Cannot create data element without a current task",
                    Status = StatusCodes.Status409Conflict,
                };
            }
            var dataMutator = await _instanceDataUnitOfWorkInitializer.Init(instance, taskId, language);

            // Save data elements with form data
            if (dataType.AppLogic?.ClassRef is { } classRef)
            {
                object? appModel;
                if (Request.ContentType is null)
                {
                    appModel = _appModel.Create(classRef);
                }
                else
                {
                    var deserializationResult = await _modelDeserializer.DeserializeSingleFromStream(
                        Request.Body,
                        Request.ContentType,
                        dataType
                    );
                    if (deserializationResult.Success)
                    {
                        appModel = deserializationResult.Ok;
                    }
                    else
                    {
                        return deserializationResult.Error;
                    }
                }

                // runs prefill from repo configuration if config exists
                await _prefillService.PrefillDataModel(
                    dataMutator.Instance.InstanceOwner.PartyId,
                    dataType.Id,
                    appModel
                );
                var instantiationProcessor = _appImplementationFactory.GetRequired<IInstantiationProcessor>();
                await instantiationProcessor.DataCreation(dataMutator.Instance, appModel, null);

                // Just stage the element to be created. We don't get the element id before we call UpdateInstanceData
                dataMutator.AddFormDataElement(dataType.Id, appModel);
            }
            else
            {
                (bool validationRestrictionSuccess, List<ValidationIssue> errors) =
                    DataRestrictionValidation.CompliesWithDataRestrictions(Request, dataType);

                if (!validationRestrictionSuccess)
                {
                    var issuesWithSource = errors
                        .Select(e => ValidationIssueWithSource.FromIssue(e, "DataRestrictionValidation", false))
                        .ToList();
                    return new DataPostErrorResponse("Common checks failed", issuesWithSource);
                }

                if (Request.ContentType is null)
                {
                    return new ProblemDetails()
                    {
                        Title = "Missing content type",
                        Detail = "The request is missing a content type header.",
                        Status = StatusCodes.Status400BadRequest,
                    };
                }

                var (bytes, actualLength) = await Request.ReadBodyAsByteArrayAsync(dataType.MaxSize * 1024 * 1024);
                if (bytes is null)
                {
                    return new ProblemDetails()
                    {
                        Title = "Request too large",
                        Detail =
                            $"The request body is too large. The content length is {actualLength} bytes, which exceeds the limit of {dataType.MaxSize} MB",
                        Status = StatusCodes.Status413RequestEntityTooLarge,
                    };
                }

                if (bytes.Length is 0)
                {
                    return new ProblemDetails()
                    {
                        Title = "Invalid data",
                        Detail = "Invalid data provided. Error: The file is zero bytes.",
                        Status = StatusCodes.Status400BadRequest,
                    };
                }

                bool parseSuccess = Request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues);
                string? filename = parseSuccess ? DataRestrictionValidation.GetFileNameFromHeader(headerValues) : null;

                var analysisAndValidationProblem = await RunFileAnalysisAndValidation(dataType, bytes, filename);
                if (analysisAndValidationProblem != null)
                {
                    return analysisAndValidationProblem;
                }

                //schedule the binary data element to be created
                dataMutator.AddBinaryDataElement(dataType.Id, Request.ContentType, filename, bytes);
            }

            var initialChanges = dataMutator.GetDataElementChanges(initializeAltinnRowId: true);
            if (initialChanges is not { AllChanges: [var change] })
            {
                throw new InvalidOperationException("Expected exactly one change in initialChanges");
            }

            await _patchService.RunDataProcessors(dataMutator, initialChanges, taskId, language);

            if (dataMutator.GetAbandonResponse() is { } abandonResponse)
            {
                return abandonResponse;
            }

            var finalChanges = dataMutator.GetDataElementChanges(initializeAltinnRowId: true);
            await dataMutator.UpdateInstanceData(finalChanges);
            var saveTask = dataMutator.SaveChanges(finalChanges);
            List<ValidationSourcePair> validationIssues = [];
            if (ignoredValidatorsString is not null)
            {
                var ignoredValidators = ignoredValidatorsString
                    .Split(',')
                    .Where(v => !string.IsNullOrEmpty(v))
                    .ToList();
                validationIssues = await _patchService.RunIncrementalValidation(
                    dataMutator,
                    taskId,
                    finalChanges,
                    ignoredValidators,
                    language
                );
            }

            await saveTask;
            SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

            var newDataElement =
                change.DataElement ?? throw new InvalidOperationException("The change was not updated while saving");
            return new DataPostResponse
            {
                Instance = instance,
                NewDataElementId = Guid.Parse(newDataElement.Id),
                NewDataModels = GetNewDataModels(finalChanges),
                ValidationIssues = validationIssues,
            };
        }
        catch (PlatformHttpException e)
        {
            return new ProblemDetails()
            {
                Title = "Platform error",
                Detail = e.Message,
                Status = (int)e.Response.StatusCode,
            };
        }
    }

    private static List<DataModelPairResponse> GetNewDataModels(DataElementChanges finalChanges)
    {
        // Return currentFormData for form data changes that are created or updated
        return finalChanges
            .FormDataChanges.Where(c => c.Type != ChangeType.Deleted)
            .Select(formDataChange => new DataModelPairResponse(
                formDataChange.DataElementIdentifier.Guid,
                formDataChange.CurrentFormData
            ))
            .ToList();
    }

    private async Task<ProblemDetails?> RunFileAnalysisAndValidation(
        DataType dataTypeFromMetadata,
        byte[] bytes,
        string? filename
    )
    {
        List<FileAnalysisResult> fileAnalysisResults = [];
        if (FileAnalysisEnabledForDataType(dataTypeFromMetadata))
        {
            fileAnalysisResults = (
                await _fileAnalyserService.Analyse(dataTypeFromMetadata, new MemoryAsStream(bytes), filename)
            ).ToList();
        }

        var fileValidationSuccess = true;
        List<ValidationIssueWithSource> validationIssues = [];
        if (FileValidationEnabledForDataType(dataTypeFromMetadata))
        {
            (fileValidationSuccess, validationIssues) = await _fileValidationService.Validate(
                dataTypeFromMetadata,
                fileAnalysisResults
            );
        }

        if (!fileValidationSuccess)
        {
            return new DataPostErrorResponse("File validation failed", validationIssues);
        }

        return null;
    }

    /// <summary>
    /// File validation requires json object in response and is introduced in the
    /// methods above validating files. In order to be consistent for the return types
    /// of this controller, old methods are updated to return json object in response.
    /// Since this is a breaking change, a feature flag is introduced to control the behaviour,
    /// and the developer need to opt in to the new behaviour. Json object are by default
    /// returned as part of file validation which is a new feature.
    /// </summary>
    private async Task<object> GetErrorDetails(List<ValidationIssueWithSource> errors)
    {
        return await _featureManager.IsEnabledAsync(FeatureFlags.JsonObjectInDataResponse)
            ? errors
            : string.Join(";", errors.Select(x => x.Description));
    }

    private static bool FileAnalysisEnabledForDataType(DataType dataTypeFromMetadata)
    {
        return dataTypeFromMetadata.EnabledFileAnalysers is { Count: > 0 };
    }

    private static bool FileValidationEnabledForDataType(DataType dataTypeFromMetadata)
    {
        return dataTypeFromMetadata.EnabledFileValidators is { Count: > 0 };
    }

    /// <summary>
    /// Gets a data element from storage and applies business logic if necessary.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="dataGuid">unique id to identify the data element to get</param>
    /// <param name="dataType">Optional parameter, verified if pressent. Used to have different schemas for different data types in openApi spec</param>
    /// <param name="includeRowId">Whether to initialize or remove AltinnRowId fields in the model</param>
    /// <param name="language">The language selected by the user.</param>
    /// <returns>The data element is returned in the body of the response</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [HttpGet("{dataGuid:guid}")]
    [HttpGet("{dataGuid:guid}/type/{dataType}")]
    public async Task<ActionResult> Get(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromRoute] string? dataType = null,
        [FromQuery] bool includeRowId = false,
        [FromQuery] string? language = null
    )
    {
        try
        {
            var instanceResult = await GetInstanceDataOrError(
                org,
                app,
                instanceOwnerPartyId,
                instanceGuid,
                dataElementGuid: dataGuid
            );
            if (!instanceResult.Success)
            {
                return Problem(instanceResult.Error);
            }
            var (instance, dataTypeObject, dataElement) = instanceResult.Ok;

            if (dataType is not null && dataTypeObject.Id != dataType)
            {
                return BadRequest(
                    $"Data type {dataType} does not match data element {dataGuid}, which is of type {dataTypeObject.Id}"
                );
            }

            if (await _dataElementAccessChecker.GetReaderProblem(instance, dataTypeObject) is { } accessProblem)
            {
                return Problem(accessProblem);
            }

            if (dataTypeObject.AppLogic?.ClassRef is not null)
            {
                return await GetFormData(
                    org,
                    app,
                    instanceOwnerPartyId,
                    instanceGuid,
                    instance,
                    dataGuid,
                    dataElement,
                    dataTypeObject,
                    includeRowId,
                    language
                );
            }

            return await GetBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, dataElement);
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Cannot get data element of {dataGuid} for {instanceOwnerPartyId}/{instanceGuid}"
            );
        }
    }

    /// <summary>
    ///  Updates an existing data element with new content.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="dataGuid">unique id to identify the data element to update</param>
    /// <param name="dataType">Optional parameter, verified if pressent. Used to have different schemas for different data types in openApi spec,</param>
    /// <param name="language">The language selected by the user.</param>
    /// <returns>The updated data element, including the changed fields in the event of a calculation that changed data.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPut("{dataGuid:guid}")]
    [HttpPut("{dataGuid:guid}/type/{dataType}")]
    [DisableFormValueModelBinding]
    [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
    [ProducesResponseType(typeof(DataElement), 201)]
    [ProducesResponseType(typeof(CalculationResult), 200)]
    public async Task<ActionResult> Put(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromRoute] string? dataType = null,
        [FromQuery] string? language = null
    )
    {
        try
        {
            var instanceResult = await GetInstanceDataOrError(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);
            if (!instanceResult.Success)
            {
                return Problem(instanceResult.Error);
            }
            var (instance, dataTypeObject, dataElement) = instanceResult.Ok;

            if (dataType is not null && dataTypeObject.Id != dataType)
            {
                return BadRequest(
                    $"Data type {dataType} does not match data element {dataGuid}, which is of type {dataTypeObject.Id}"
                );
            }

            if (
                await _dataElementAccessChecker.GetUpdateProblem(
                    instance,
                    dataTypeObject,
                    _authenticationContext.Current
                ) is
                { } accessProblem
            )
            {
                return Problem(accessProblem);
            }

            if (dataTypeObject.AppLogic?.ClassRef is not null)
            {
                return await PutFormData(instance, dataElement, dataTypeObject, language);
            }

            return await PutBinaryData(instanceOwnerPartyId, instanceGuid, dataGuid, dataTypeObject);
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Unable to update data element {dataGuid} for instance {instanceOwnerPartyId}/{instanceGuid}"
            );
        }
    }

    /// <summary>
    /// Updates an existing form data element with a patch of changes.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="dataGuid">unique id to identify the data element to update</param>
    /// <param name="dataPatchRequest">Container object for the <see cref="JsonPatch" /> and list of ignored validators</param>
    /// <param name="language">The language selected by the user.</param>
    /// <returns>A response object with the new full model and validation issues from all the groups that run</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPatch("{dataGuid:guid}")]
    [ProducesResponseType(typeof(DataPatchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [Obsolete("Use PatchFormDataMultiple instead")]
    public async Task<ActionResult<DataPatchResponse>> PatchFormData(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromBody] DataPatchRequest dataPatchRequest,
        [FromQuery] string? language = null
    )
    {
        // Validation valid request is performed in the PatchFormDataMultiple method
        var request = new DataPatchRequestMultiple()
        {
            Patches = [new(dataGuid, dataPatchRequest.Patch)],
            IgnoredValidators = dataPatchRequest.IgnoredValidators,
        };
        var response = await PatchFormDataMultiple(org, app, instanceOwnerPartyId, instanceGuid, request, language);

        if (response.Result is OkObjectResult { Value: DataPatchResponseMultiple newResponse })
        {
            // Map the new response to the old response
            return Ok(
                new DataPatchResponse
                {
                    ValidationIssues = newResponse.ValidationIssues.ToDictionary(d => d.Source, d => d.Issues),
                    NewDataModel = newResponse.NewDataModels.First(m => m.DataElementId == dataGuid).Data,
                    Instance = newResponse.Instance,
                }
            );
        }

        // Return the error object unchanged
        return response.Result ?? throw new InvalidOperationException("Response is null");
    }

    /// <summary>
    /// Updates an existing form data element with patches to multiple data elements.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="dataPatchRequestMultiple">Container object for the <see cref="JsonPatch" /> and list of ignored validators</param>
    /// <param name="language">The language selected by the user.</param>
    /// <returns>A response object with the new full model and validation issues from all the groups that run</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPatch("")]
    [ProducesResponseType(typeof(DataPatchResponseMultiple), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 409)]
    [ProducesResponseType(typeof(ProblemDetails), 422)]
    [ProducesResponseType(typeof(ProblemDetails), 400)]
    [ProducesResponseType(typeof(ProblemDetails), 404)]
    public async Task<ActionResult<DataPatchResponseMultiple>> PatchFormDataMultiple(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromBody] DataPatchRequestMultiple dataPatchRequestMultiple,
        [FromQuery] string? language = null
    )
    {
        try
        {
            var instanceResult = await GetInstanceDataOrError(
                org,
                app,
                instanceOwnerPartyId,
                instanceGuid,
                dataPatchRequestMultiple.Patches.Select(p => p.DataElementId)
            );
            if (!instanceResult.Success)
            {
                return Problem(instanceResult.Error);
            }
            var (instance, dataTypes) = instanceResult.Ok;

            // Verify that the data elements isn't restricted for the user
            foreach (var dataType in dataTypes)
            {
                if (
                    await _dataElementAccessChecker.GetUpdateProblem(
                        instance,
                        dataType,
                        _authenticationContext.Current
                    ) is
                    { } accessProblem
                )
                {
                    return Problem(accessProblem);
                }
            }

            ServiceResult<DataPatchResult, ProblemDetails> res = await _patchService.ApplyPatches(
                instance,
                dataPatchRequestMultiple.Patches.ToDictionary(i => i.DataElementId, i => i.Patch),
                language,
                dataPatchRequestMultiple.IgnoredValidators
            );

            if (res.Success)
            {
                return Ok(
                    new DataPatchResponseMultiple()
                    {
                        Instance = await res.Ok.Instance.WithOnlyAccessibleDataElements(_dataElementAccessChecker),
                        NewDataModels = GetNewDataModels(res.Ok.FormDataChanges),
                        ValidationIssues = res.Ok.ValidationIssues,
                    }
                );
            }

            return Problem(res.Error);
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Unable to update data element {string.Join(", ", dataPatchRequestMultiple.Patches.Select(i => i.DataElementId))} for instance {instanceOwnerPartyId}/{instanceGuid}"
            );
        }
    }

    /// <summary>
    ///  Delete a data element.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="dataGuid">unique id to identify the data element to update</param>
    /// <param name="dataType">Optional parameter, verified if pressent. Used to have different schemas for different data types in openApi spec,</param>
    /// <param name="ignoredValidators">comma separated string of validators to ignore</param>
    /// <param name="language">The currently active language</param>
    /// <returns>The updated data element.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpDelete("{dataGuid:guid}")]
    public async Task<ActionResult<DataPostResponse>> Delete(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromRoute] string? dataType = null,
        [FromQuery] string? ignoredValidators = null,
        [FromQuery] string? language = null
    )
    {
        try
        {
            var instanceResult = await GetInstanceDataOrError(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);
            if (!instanceResult.Success)
            {
                return Problem(instanceResult.Error);
            }
            var (instance, dataTypeObject, dataElement) = instanceResult.Ok;

            if (dataType is not null && dataTypeObject.Id != dataType)
            {
                return BadRequest(
                    $"Data type {dataType} does not match data element {dataGuid}, which is of type {dataTypeObject.Id}"
                );
            }

            if (
                await _dataElementAccessChecker.GetDeleteProblem(
                    instance,
                    dataTypeObject,
                    dataGuid,
                    _authenticationContext.Current
                ) is
                { } accessProblem
            )
            {
                return Problem(accessProblem);
            }

            var taskId =
                instance.Process?.CurrentTask?.ElementId
                ?? throw new InvalidOperationException("Instance have no process");

            var dataMutator = await _instanceDataUnitOfWorkInitializer.Init(instance, taskId, language);

            dataMutator.RemoveDataElement(dataElement);

            // Get the single change for running data processors
            var changes = dataMutator.GetDataElementChanges(initializeAltinnRowId: false);
            await _patchService.RunDataProcessors(dataMutator, changes, taskId, language);

            if (dataMutator.GetAbandonResponse() is { } abandonResponse)
            {
                return Problem(abandonResponse);
            }
            // Get the updated changes for saving
            changes = dataMutator.GetDataElementChanges(initializeAltinnRowId: false);
            await dataMutator.UpdateInstanceData(changes);
            await dataMutator.SaveChanges(changes);

            List<ValidationSourcePair> validationIssues = [];
            if (ignoredValidators is not null)
            {
                var ignoredValidatorsList = ignoredValidators.Split(',').Where(v => !string.IsNullOrEmpty(v)).ToList();
                validationIssues = await _patchService.RunIncrementalValidation(
                    dataMutator,
                    instance.Process.CurrentTask.ElementId,
                    changes,
                    ignoredValidatorsList,
                    language
                );
            }

            return Ok(
                new DataDeleteResponse()
                {
                    Instance = instance,
                    ValidationIssues = validationIssues,
                    NewDataModels = GetNewDataModels(changes),
                }
            );
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Cannot delete data element {dataGuid} for {instanceOwnerPartyId}/{instanceGuid}"
            );
        }
    }

    private ObjectResult ExceptionResponse(Exception exception, string message)
    {
        _logger.LogError(exception, message);

        if (exception is PlatformHttpException phe)
        {
            return StatusCode((int)phe.Response.StatusCode, phe.Message);
        }

        if (exception is ServiceException se)
        {
            return StatusCode((int)se.StatusCode, se.Message);
        }

        return StatusCode(StatusCodes.Status500InternalServerError, $"{message}");
    }

    /// <summary>
    /// Gets a data element from storage.
    /// </summary>
    /// <returns>The data element is returned in the body of the response</returns>
    private async Task<ActionResult> GetBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        DataElement dataElement
    )
    {
        Stream dataStream = await _dataClient.GetBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);

        if (dataStream is not null)
        {
            string? userOrgClaim = User.GetOrg();
            if (userOrgClaim is null || !org.Equals(userOrgClaim, StringComparison.OrdinalIgnoreCase))
            {
                await _instanceClient.UpdateReadStatus(instanceOwnerPartyId, instanceGuid, "read");
            }

            return File(dataStream, dataElement.ContentType, dataElement.Filename);
        }

        return NotFound();
    }

    private async Task<DataType?> GetDataType(DataElement element)
    {
        Application application = await _appMetadata.GetApplicationMetadata();
        return application.DataTypes.Find(e => e.Id == element.DataType);
    }

    /// <summary>
    ///  Gets a data element (form data) from storage and performs business logic on it (e.g. to calculate certain fields) before it is returned.
    ///  If more there are more data elements of the same dataType only the first one is returned. In that case use the more specific
    ///  GET method to fetch a particular data element.
    /// </summary>
    /// <returns>data element is returned in response body</returns>
    private async Task<ActionResult> GetFormData(
        string org,
        string app,
        int instanceOwnerId,
        Guid instanceGuid,
        Instance instance,
        Guid dataGuid,
        DataElement dataElement,
        DataType dataType,
        bool includeRowId,
        string? language
    )
    {
        // Get Form Data from data service. Assumes that the data element is form data.
        object appModel = await _dataClient.GetFormData(
            instanceGuid,
            _appModel.GetModelType(dataType.AppLogic.ClassRef),
            org,
            app,
            instanceOwnerId,
            dataGuid
        );

        if (appModel is null)
        {
            return BadRequest($"Did not find form data for data element {dataGuid}");
        }

        // we need to save a copy to detect changes if dataProcessRead changes the model
        byte[] beforeProcessDataRead = JsonSerializer.SerializeToUtf8Bytes(appModel);

        var dataProcessors = _appImplementationFactory.GetAll<IDataProcessor>();
        foreach (var dataProcessor in dataProcessors)
        {
            _logger.LogInformation(
                "ProcessDataRead for {ModelType} using {DataProcessor}",
                appModel.GetType().Name,
                dataProcessor.GetType().Name
            );
            await dataProcessor.ProcessDataRead(instance, dataGuid, appModel, language);
        }

        if (includeRowId)
        {
            ObjectUtils.InitializeAltinnRowId(appModel);
        }

        // Save back the changes if dataProcessRead has changed the model and the element is not locked
        if (!dataElement.Locked && !beforeProcessDataRead.SequenceEqual(JsonSerializer.SerializeToUtf8Bytes(appModel)))
        {
            try
            {
                await _dataClient.UpdateData(
                    appModel,
                    instanceGuid,
                    appModel.GetType(),
                    org,
                    app,
                    instanceOwnerId,
                    dataGuid
                );
            }
            catch (PlatformHttpException e) when (e.Response.StatusCode is HttpStatusCode.Forbidden)
            {
                _logger.LogInformation("User does not have write access to the data element. Skipping update.");
            }
        }

        if (!includeRowId)
        {
            // If the consumer does not request AltinnRowId to be initialized, we remove it from the model
            ObjectUtils.RemoveAltinnRowId(appModel);
        }

        // This is likely not required as the instance is already read
        string? userOrgClaim = User.GetOrg();
        if (userOrgClaim is null || !org.Equals(userOrgClaim, StringComparison.OrdinalIgnoreCase))
        {
            await _instanceClient.UpdateReadStatus(instanceOwnerId, instanceGuid, "read");
        }

        return Ok(appModel);
    }

    private async Task<ActionResult> PutBinaryData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        DataType dataType
    )
    {
        //TODO: Consider having a rule that disables PUT for binary data elements.

        (bool validationRestrictionSuccess, List<ValidationIssue> errors) =
            DataRestrictionValidation.CompliesWithDataRestrictions(Request, dataType);

        if (!validationRestrictionSuccess)
        {
            return BadRequest(
                await GetErrorDetails(
                    errors
                        .Select(e => ValidationIssueWithSource.FromIssue(e, "DataRestrictionValidation", false))
                        .ToList()
                )
            );
        }

        if (!Request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
        {
            return BadRequest("Invalid data provided. Error:  The request must include a Content-Disposition header");
        }

        var contentDispositionHeader = ContentDispositionHeaderValue.Parse(headerValues.ToString());
        _logger.LogInformation("Content-Disposition: {ContentDisposition}", headerValues.ToString());

        var (bytes, actualLength) = await Request.ReadBodyAsByteArrayAsync(
            dataType.MaxSize * 1024 * 1024 ?? REQUEST_SIZE_LIMIT
        );
        if (bytes is null)
        {
            return BadRequest(
                $"The request body is too large. The content length is {actualLength} bytes, which exceeds the limit of {dataType.MaxSize} MB"
            );
        }

        var analysisAndValidationProblem = await RunFileAnalysisAndValidation(
            dataType,
            bytes,
            contentDispositionHeader.FileName.ToString()
        );
        if (analysisAndValidationProblem != null)
        {
            return Problem(analysisAndValidationProblem);
        }

        DataElement dataElement = await _dataClient.UpdateBinaryData(
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid),
            Request.ContentType,
            contentDispositionHeader.FileName.ToString(),
            dataGuid,
            new MemoryAsStream(bytes)
        );

        SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);

        return Created(dataElement.SelfLinks.Apps, dataElement);
    }

    private async Task<ActionResult> PutFormData(
        Instance instance,
        DataElement dataElement,
        DataType dataType,
        string? language
    )
    {
        var deserializationResult = await _modelDeserializer.DeserializeSingleFromStream(
            Request.Body,
            Request.ContentType,
            dataType
        );
        if (!deserializationResult.Success)
        {
            return Problem(deserializationResult.Error);
        }

        var serviceModel = deserializationResult.Ok;

        var taskId = instance.Process?.CurrentTask?.ElementId;
        if (taskId is null)
        {
            return Problem(
                new ProblemDetails()
                {
                    Title = "No current task",
                    Detail = "Cannot update data element without a current task",
                    Status = StatusCodes.Status409Conflict,
                }
            );
        }

        var dataMutator = await _instanceDataUnitOfWorkInitializer.Init(instance, taskId, language);

        // Get the previous service model for dataProcessing to work
        var oldServiceModel = await dataMutator.GetFormData(dataElement);
        // Set the new service model so that dataAccessors see the new state
        dataMutator.SetFormData(dataElement, FormDataWrapperFactory.Create(serviceModel));

        var requestedChange = new FormDataChange(
            type: ChangeType.Updated,
            dataElement: dataElement,
            contentType: dataElement.ContentType,
            dataType: dataType,
            previousFormDataWrapper: FormDataWrapperFactory.Create(oldServiceModel),
            currentFormDataWrapper: FormDataWrapperFactory.Create(serviceModel),
            previousBinaryData: await dataMutator.GetBinaryData(dataElement),
            currentBinaryData: null // We don't serialize to xml before running data processors
        );

        // Run data processors keeping track of changes for diff return
        var jsonBeforeDataProcessors = JsonSerializer.Serialize(serviceModel);
        await _patchService.RunDataProcessors(dataMutator, new DataElementChanges([requestedChange]), taskId, language);
        var jsonAfterDataProcessors = JsonSerializer.Serialize(serviceModel);

        if (dataMutator.GetAbandonResponse() is { } abandonResponse)
        {
            return Problem(abandonResponse);
        }

        // Save changes
        var changesAfterDataProcessors = dataMutator.GetDataElementChanges(initializeAltinnRowId: true);
        await dataMutator.UpdateInstanceData(changesAfterDataProcessors);
        await dataMutator.SaveChanges(changesAfterDataProcessors);

        //set self links
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);
        string dataUrl = dataElement.SelfLinks.Apps;

        if (jsonBeforeDataProcessors != jsonAfterDataProcessors)
        {
            // Return the changes caused by the data processors
            var changedFields = JsonHelper.FindChangedFields(jsonBeforeDataProcessors, jsonAfterDataProcessors);
            if (changedFields.Count > 0)
            {
                CalculationResult calculationResult = new(dataElement) { ChangedFields = changedFields };
                return Ok(calculationResult);
            }
        }

        return Created(dataUrl, dataElement);
    }

    private ActionResult HandlePlatformHttpException(PlatformHttpException e, string defaultMessage)
    {
        return e.Response.StatusCode switch
        {
            HttpStatusCode.Forbidden => Forbid(),
            HttpStatusCode.NotFound => NotFound(),
            HttpStatusCode.Conflict => Conflict(),
            _ => ExceptionResponse(e, defaultMessage),
        };
    }

    private ObjectResult Problem(ProblemDetails error)
    {
        return StatusCode(error.Status ?? StatusCodes.Status500InternalServerError, error);
    }

    private async Task<
        ServiceResult<(Instance instance, DataType dataType, DataElement dataElement), ProblemDetails>
    > GetInstanceDataOrError(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataElementGuid)
    {
        try
        {
            var instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance is null)
            {
                return new ProblemDetails()
                {
                    Title = "Instance Not Found",
                    Detail = $"Did not find instance {instanceOwnerPartyId}/{instanceGuid}",
                    Status = StatusCodes.Status404NotFound,
                };
            }

            var dataElement = instance.Data.FirstOrDefault(m =>
                m.Id.Equals(dataElementGuid.ToString(), StringComparison.Ordinal)
            );

            if (dataElement is null)
            {
                return new ProblemDetails()
                {
                    Title = "Data Element Not Found",
                    Detail =
                        $"Did not find data element {dataElementGuid} on instance {instanceOwnerPartyId}/{instanceGuid}",
                    Status = StatusCodes.Status404NotFound,
                };
            }

            var dataType = await GetDataType(dataElement);
            if (dataType is null)
            {
                return new ProblemDetails()
                {
                    Title = "Data Type Not Found",
                    Detail =
                        $"""Could not find the specified data type: "{dataElement.DataType}" in applicationmetadata.json""",
                    Status = StatusCodes.Status400BadRequest,
                };
            }

            return (instance, dataType, dataElement);
        }
        catch (PlatformHttpException e)
        {
            return new ProblemDetails()
            {
                Title = "Instance Not Found",
                Detail = e.Message,
                Status = (int)e.Response.StatusCode,
            };
        }
    }

    private async Task<ServiceResult<(Instance, IEnumerable<DataType>), ProblemDetails>> GetInstanceDataOrError(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        IEnumerable<Guid> dataElementGuids
    )
    {
        try
        {
            var application = await _appMetadata.GetApplicationMetadata();
            var instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance is null)
            {
                return new ProblemDetails()
                {
                    Title = "Instance Not Found",
                    Detail = $"Did not find instance {instanceOwnerPartyId}/{instanceGuid}",
                    Status = StatusCodes.Status404NotFound,
                };
            }

            HashSet<DataType> dataTypes = [];

            foreach (var dataElementGuid in dataElementGuids)
            {
                var dataElement = instance.Data.FirstOrDefault(m =>
                    m.Id.Equals(dataElementGuid.ToString(), StringComparison.Ordinal)
                );

                if (dataElement is null)
                {
                    return new ProblemDetails()
                    {
                        Title = "Data Element Not Found",
                        Detail =
                            $"Did not find data element {dataElementGuid} on instance {instanceOwnerPartyId}/{instanceGuid}",
                        Status = StatusCodes.Status404NotFound,
                    };
                }

                var dataType = application.DataTypes.Find(e => e.Id == dataElement.DataType);
                if (dataType is null)
                {
                    return new ProblemDetails()
                    {
                        Title = "Data Type Not Found",
                        Detail =
                            $"""Data element {dataElement.Id} requires data type "{dataElement.DataType}", but it was not found in applicationmetadata.json""",
                        Status = StatusCodes.Status500InternalServerError,
                    };
                }

                dataTypes.Add(dataType);
            }

            return (instance, dataTypes);
        }
        catch (PlatformHttpException e)
        {
            return new ProblemDetails()
            {
                Title = "Instance Not Found",
                Detail = e.Message,
                Status = (int)e.Response.StatusCode,
            };
        }
    }

    private async Task<
        ServiceResult<(Instance instance, DataType dataType, ApplicationMetadata applicationMetadata), ProblemDetails>
    > GetInstanceDataOrError(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, string dataTypeId)
    {
        try
        {
            var instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance is null)
            {
                return new ProblemDetails()
                {
                    Title = "Instance Not Found",
                    Detail = $"Did not find instance {instanceOwnerPartyId}/{instanceGuid}",
                    Status = StatusCodes.Status404NotFound,
                };
            }

            var application = await _appMetadata.GetApplicationMetadata();
            var dataType = application.DataTypes.Find(e => e.Id == dataTypeId);

            if (dataType is null)
            {
                return new ProblemDetails
                {
                    Title = "Data Type Not Found",
                    Detail = $"""Could not find the specified data type: "{dataTypeId}" in applicationmetadata.json""",
                    Status = StatusCodes.Status400BadRequest,
                };
            }

            return (instance, dataType, application);
        }
        catch (PlatformHttpException e)
        {
            return new ProblemDetails()
            {
                Title = "Instance Not Found",
                Detail = e.Message,
                Status = (int)e.Response.StatusCode,
            };
        }
    }
}
