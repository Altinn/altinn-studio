using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Altinn.App.Api.Helpers.RequestHandling;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.FileAnalyzis;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Patch;
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

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// The data controller handles creation, update, validation and calculation of data elements.
    /// </summary>
    [AutoValidateAntiforgeryTokenIfAuthCookie]
    [ApiController]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data")]
    public class DataController : ControllerBase
    {
        private readonly ILogger<DataController> _logger;
        private readonly IDataClient _dataClient;
        private readonly IEnumerable<IDataProcessor> _dataProcessors;
        private readonly IInstanceClient _instanceClient;
        private readonly IInstantiationProcessor _instantiationProcessor;
        private readonly IAppModel _appModel;
        private readonly IAppResources _appResourcesService;
        private readonly IAppMetadata _appMetadata;
        private readonly IPrefill _prefillService;
        private readonly IFileAnalysisService _fileAnalyserService;
        private readonly IFileValidationService _fileValidationService;
        private readonly IFeatureManager _featureManager;
        private readonly IPatchService _patchService;

        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        /// <summary>
        /// The data controller is responsible for adding business logic to the data elements.
        /// </summary>
        /// <param name="logger">logger</param>
        /// <param name="instanceClient">instance service to store instances</param>
        /// <param name="instantiationProcessor">Instantiation processor</param>
        /// <param name="dataClient">A service with access to data storage.</param>
        /// <param name="dataProcessors">Services implementing logic during data read/write</param>
        /// <param name="appModel">Service for generating app model</param>
        /// <param name="appResourcesService">The apps resource service</param>
        /// <param name="appMetadata">The app metadata service</param>
        /// <param name="featureManager">The feature manager controlling enabled features.</param>
        /// <param name="prefillService">A service with prefill related logic.</param>
        /// <param name="fileAnalyserService">Service used to analyse files uploaded.</param>
        /// <param name="fileValidationService">Service used to validate files uploaded.</param>
        /// <param name="patchService">Service for applying a json patch to a json serializable object</param>
        public DataController(
            ILogger<DataController> logger,
            IInstanceClient instanceClient,
            IInstantiationProcessor instantiationProcessor,
            IDataClient dataClient,
            IEnumerable<IDataProcessor> dataProcessors,
            IAppModel appModel,
            IAppResources appResourcesService,
            IPrefill prefillService,
            IFileAnalysisService fileAnalyserService,
            IFileValidationService fileValidationService,
            IAppMetadata appMetadata,
            IFeatureManager featureManager,
            IPatchService patchService
        )
        {
            _logger = logger;

            _instanceClient = instanceClient;
            _instantiationProcessor = instantiationProcessor;
            _dataClient = dataClient;
            _dataProcessors = dataProcessors;
            _appModel = appModel;
            _appResourcesService = appResourcesService;
            _appMetadata = appMetadata;
            _prefillService = prefillService;
            _fileAnalyserService = fileAnalyserService;
            _fileValidationService = fileValidationService;
            _featureManager = featureManager;
            _patchService = patchService;
        }

        /// <summary>
        /// Creates and instantiates a data element of a given element-type. Clients can upload the data element in the request content.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataType">identifies the data element type to create</param>
        /// <returns>A list is returned if multiple elements are created.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 201)]
        public async Task<ActionResult> Create(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string dataType
        )
        {
            /* The Body of the request is read much later when it has been made sure it is worth it. */

            try
            {
                Application application = await _appMetadata.GetApplicationMetadata();

                DataType? dataTypeFromMetadata = application.DataTypes.First(e =>
                    e.Id.Equals(dataType, StringComparison.InvariantCultureIgnoreCase)
                );

                if (dataTypeFromMetadata == null)
                {
                    return BadRequest(
                        $"Element type {dataType} not allowed for instance {instanceOwnerPartyId}/{instanceGuid}."
                    );
                }

                if (!IsValidContributer(dataTypeFromMetadata, User))
                {
                    return Forbid();
                }

                bool appLogic = dataTypeFromMetadata.AppLogic?.ClassRef != null;

                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                if (instance == null)
                {
                    return NotFound($"Did not find instance {instance}");
                }

                if (!InstanceIsActive(instance))
                {
                    return Conflict(
                        $"Cannot upload data for archived or deleted instance {instanceOwnerPartyId}/{instanceGuid}"
                    );
                }

                if (appLogic)
                {
                    return await CreateAppModelData(org, app, instance, dataType);
                }
                else
                {
                    (bool validationRestrictionSuccess, List<ValidationIssue> errors) =
                        DataRestrictionValidation.CompliesWithDataRestrictions(Request, dataTypeFromMetadata);
                    if (!validationRestrictionSuccess)
                    {
                        return BadRequest(await GetErrorDetails(errors));
                    }

                    StreamContent streamContent = Request.CreateContentStream();

                    using Stream fileStream = new MemoryStream();
                    await streamContent.CopyToAsync(fileStream);
                    if (fileStream.Length == 0)
                    {
                        const string errorMessage = "Invalid data provided. Error: The file is zero bytes.";
                        var error = new ValidationIssue
                        {
                            Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                            Severity = ValidationIssueSeverity.Error,
                            Description = errorMessage
                        };
                        _logger.LogError(errorMessage);
                        return BadRequest(await GetErrorDetails(new List<ValidationIssue> { error }));
                    }

                    bool parseSuccess = Request.Headers.TryGetValue(
                        "Content-Disposition",
                        out StringValues headerValues
                    );
                    string? filename = parseSuccess
                        ? DataRestrictionValidation.GetFileNameFromHeader(headerValues)
                        : null;

                    IEnumerable<FileAnalysisResult> fileAnalysisResults = new List<FileAnalysisResult>();
                    if (FileAnalysisEnabledForDataType(dataTypeFromMetadata))
                    {
                        fileAnalysisResults = await _fileAnalyserService.Analyse(
                            dataTypeFromMetadata,
                            fileStream,
                            filename
                        );
                    }

                    bool fileValidationSuccess = true;
                    List<ValidationIssue> validationIssues = new();
                    if (FileValidationEnabledForDataType(dataTypeFromMetadata))
                    {
                        (fileValidationSuccess, validationIssues) = await _fileValidationService.Validate(
                            dataTypeFromMetadata,
                            fileAnalysisResults
                        );
                    }

                    if (!fileValidationSuccess)
                    {
                        return BadRequest(await GetErrorDetails(validationIssues));
                    }

                    fileStream.Seek(0, SeekOrigin.Begin);
                    return await CreateBinaryData(
                        instance,
                        dataType,
                        streamContent.Headers.ContentType.ToString(),
                        filename,
                        fileStream
                    );
                }
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(
                    e,
                    $"Cannot create data element of {dataType} for {instanceOwnerPartyId}/{instanceGuid}"
                );
            }
        }

        /// <summary>
        /// File validation requires json object in response and is introduced in the
        /// the methods above validating files. In order to be consistent for the return types
        /// of this controller, old methods are updated to return json object in response.
        /// Since this is a breaking change, a feature flag is introduced to control the behaviour,
        /// and the developer need to opt-in to the new behaviour. Json object are by default
        /// returned as part of file validation which is a new feature.
        /// </summary>
        private async Task<object> GetErrorDetails(List<ValidationIssue> errors)
        {
            return await _featureManager.IsEnabledAsync(FeatureFlags.JsonObjectInDataResponse)
                ? errors
                : string.Join(";", errors.Select(x => x.Description));
        }

        private static bool FileAnalysisEnabledForDataType(DataType dataTypeFromMetadata)
        {
            return dataTypeFromMetadata.EnabledFileAnalysers != null
                && dataTypeFromMetadata.EnabledFileAnalysers.Count > 0;
        }

        private static bool FileValidationEnabledForDataType(DataType dataTypeFromMetadata)
        {
            return dataTypeFromMetadata.EnabledFileValidators != null
                && dataTypeFromMetadata.EnabledFileValidators.Count > 0;
        }

        /// <summary>
        /// Gets a data element from storage and applies business logic if nessesary.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to get</param>
        /// <param name="includeRowId">Whether to initialize or remove AltinnRowId fields in the model</param>
        /// <param name="language">The language selected by the user.</param>
        /// <returns>The data element is returned in the body of the response</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("{dataGuid:guid}")]
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid,
            [FromQuery] bool includeRowId = false,
            [FromQuery] string? language = null
        )
        {
            try
            {
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                if (instance == null)
                {
                    return NotFound($"Did not find instance {instance}");
                }

                DataElement? dataElement = instance.Data.First(m => m.Id.Equals(dataGuid.ToString()));

                if (dataElement == null)
                {
                    return NotFound("Did not find data element");
                }

                DataType? dataType = await GetDataType(dataElement);

                if (dataType is null)
                {
                    string error = $"Could not determine if {dataType} requires app logic for application {org}/{app}";
                    _logger.LogError(error);
                    return BadRequest(error);
                }
                else if (dataType.AppLogic?.ClassRef is not null)
                {
                    return await GetFormData(
                        org,
                        app,
                        instanceOwnerPartyId,
                        instanceGuid,
                        instance,
                        dataGuid,
                        dataElement,
                        dataType,
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
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to update</param>
        /// <param name="language">The language selected by the user.</param>
        /// <returns>The updated data element, including the changed fields in the event of a calculation that changed data.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPut("{dataGuid:guid}")]
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
            [FromQuery] string? language = null
        )
        {
            try
            {
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

                if (!InstanceIsActive(instance))
                {
                    return Conflict(
                        $"Cannot update data element of archived or deleted instance {instanceOwnerPartyId}/{instanceGuid}"
                    );
                }

                DataElement? dataElement = instance.Data.First(m => m.Id.Equals(dataGuid.ToString()));

                if (dataElement == null)
                {
                    return NotFound("Did not find data element");
                }

                DataType? dataType = await GetDataType(dataElement);

                if (dataType is null)
                {
                    _logger.LogError(
                        "Could not determine if {dataType} requires app logic for application {org}/{app}",
                        dataType,
                        org,
                        app
                    );
                    return BadRequest($"Could not determine if data type {dataType} requires application logic.");
                }
                else if (dataType.AppLogic?.ClassRef is not null)
                {
                    return await PutFormData(org, app, instance, dataGuid, dataType, language);
                }

                (bool validationRestrictionSuccess, List<ValidationIssue> errors) =
                    DataRestrictionValidation.CompliesWithDataRestrictions(Request, dataType);
                if (!validationRestrictionSuccess)
                {
                    return BadRequest(await GetErrorDetails(errors));
                }

                return await PutBinaryData(instanceOwnerPartyId, instanceGuid, dataGuid);
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
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to update</param>
        /// <param name="dataPatchRequest">Container object for the <see cref="JsonPatch" /> and list of ignored validators</param>
        /// <param name="language">The language selected by the user.</param>
        /// <returns>A response object with the new full model and validation issues from all the groups that run</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPatch("{dataGuid:guid}")]
        [ProducesResponseType(typeof(DataPatchResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetails), 409)]
        [ProducesResponseType(typeof(ProblemDetails), 422)]
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
            try
            {
                var instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

                if (!InstanceIsActive(instance))
                {
                    return Conflict(
                        $"Cannot update data element of archived or deleted instance {instanceOwnerPartyId}/{instanceGuid}"
                    );
                }

                var dataElement = instance.Data.First(m => m.Id.Equals(dataGuid.ToString()));

                if (dataElement == null)
                {
                    return NotFound("Did not find data element");
                }

                var dataType = await GetDataType(dataElement);

                if (dataType?.AppLogic?.ClassRef is null)
                {
                    _logger.LogError(
                        "Could not determine if {dataType} requires app logic for application {org}/{app}",
                        dataType,
                        org,
                        app
                    );
                    return BadRequest($"Could not determine if data type {dataType?.Id} requires application logic.");
                }

                ServiceResult<DataPatchResult, DataPatchError> res = await _patchService.ApplyPatch(
                    instance,
                    dataType,
                    dataElement,
                    dataPatchRequest.Patch,
                    language,
                    dataPatchRequest.IgnoredValidators
                );

                if (res.Success)
                {
                    await UpdateDataValuesOnInstance(instance, dataType.Id, res.Ok.NewDataModel);
                    await UpdatePresentationTextsOnInstance(instance, dataType.Id, res.Ok.NewDataModel);

                    return Ok(
                        new DataPatchResponse
                        {
                            NewDataModel = res.Ok.NewDataModel,
                            ValidationIssues = res.Ok.ValidationIssues
                        }
                    );
                }

                return Problem(res.Error);
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
        ///  Delete a data element.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to update</param>
        /// <returns>The updated data element.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpDelete("{dataGuid:guid}")]
        public async Task<ActionResult> Delete(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid
        )
        {
            try
            {
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                if (instance == null)
                {
                    return NotFound("Did not find instance");
                }

                if (!InstanceIsActive(instance))
                {
                    return Conflict(
                        $"Cannot delete data element of archived or deleted instance {instanceOwnerPartyId}/{instanceGuid}"
                    );
                }

                DataElement? dataElement = instance.Data.Find(m => m.Id.Equals(dataGuid.ToString()));

                if (dataElement == null)
                {
                    return NotFound("Did not find data element");
                }

                DataType? dataType = await GetDataType(dataElement);

                if (dataType == null)
                {
                    string errorMsg =
                        $"Could not determine if {dataElement.DataType} requires app logic for application {org}/{app}";
                    _logger.LogError(errorMsg);
                    return BadRequest(errorMsg);
                }
                else if (dataType.AppLogic?.ClassRef is not null)
                {
                    // trying deleting a form element
                    return BadRequest("Deleting form data is not possible at this moment.");
                }

                return await DeleteBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(
                    e,
                    $"Cannot delete data element {dataGuid} for {instanceOwnerPartyId}/{instanceGuid}"
                );
            }
        }

        private ActionResult ExceptionResponse(Exception exception, string message)
        {
            _logger.LogError(exception, message);

            if (exception is PlatformHttpException phe)
            {
                return StatusCode((int)phe.Response.StatusCode, phe.Message);
            }
            else if (exception is ServiceException se)
            {
                return StatusCode((int)se.StatusCode, se.Message);
            }

            return StatusCode(500, $"{message}");
        }

        private async Task<ActionResult> CreateBinaryData(
            Instance instanceBefore,
            string dataType,
            string contentType,
            string? filename,
            Stream fileStream
        )
        {
            int instanceOwnerPartyId = int.Parse(instanceBefore.Id.Split("/")[0]);
            Guid instanceGuid = Guid.Parse(instanceBefore.Id.Split("/")[1]);

            DataElement dataElement = await _dataClient.InsertBinaryData(
                instanceBefore.Id,
                dataType,
                contentType,
                filename,
                fileStream
            );

            if (Guid.Parse(dataElement.Id) == Guid.Empty)
            {
                return StatusCode(
                    500,
                    $"Cannot store form attachment on instance {instanceOwnerPartyId}/{instanceGuid}"
                );
            }

            SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);
            return Created(dataElement.SelfLinks.Apps, dataElement);
        }

        private async Task<ActionResult> CreateAppModelData(string org, string app, Instance instance, string dataType)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            object? appModel;

            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            if (Request.ContentType == null)
            {
                appModel = _appModel.Create(classRef);
            }
            else
            {
                ModelDeserializer deserializer = new ModelDeserializer(_logger, _appModel.GetModelType(classRef));
                appModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

                if (!string.IsNullOrEmpty(deserializer.Error) || appModel is null)
                {
                    return BadRequest(deserializer.Error);
                }
            }

            // runs prefill from repo configuration if config exists
            await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, dataType, appModel);

            await _instantiationProcessor.DataCreation(instance, appModel, null);

            await UpdatePresentationTextsOnInstance(instance, dataType, appModel);
            await UpdateDataValuesOnInstance(instance, dataType, appModel);

            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

            ObjectUtils.InitializeAltinnRowId(appModel);

            DataElement dataElement = await _dataClient.InsertFormData(
                appModel,
                instanceGuid,
                _appModel.GetModelType(classRef),
                org,
                app,
                instanceOwnerPartyId,
                dataType
            );
            SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);

            return Created(dataElement.SelfLinks.Apps, dataElement);
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

            if (dataStream != null)
            {
                string? userOrgClaim = User.GetOrg();
                if (userOrgClaim == null || !org.Equals(userOrgClaim, StringComparison.InvariantCultureIgnoreCase))
                {
                    await _instanceClient.UpdateReadStatus(instanceOwnerPartyId, instanceGuid, "read");
                }

                return File(dataStream, dataElement.ContentType, dataElement.Filename);
            }
            else
            {
                return NotFound();
            }
        }

        private async Task<ActionResult> DeleteBinaryData(
            string org,
            string app,
            int instanceOwnerId,
            Guid instanceGuid,
            Guid dataGuid
        )
        {
            bool successfullyDeleted = await _dataClient.DeleteData(
                org,
                app,
                instanceOwnerId,
                instanceGuid,
                dataGuid,
                false
            );

            if (successfullyDeleted)
            {
                return Ok();
            }
            else
            {
                return StatusCode(
                    500,
                    $"Something went wrong when deleting data element {dataGuid} for instance {instanceGuid}"
                );
            }
        }

        private async Task<DataType?> GetDataType(DataElement element)
        {
            Application application = await _appMetadata.GetApplicationMetadata();
            return application?.DataTypes.Find(e => e.Id == element.DataType);
        }

        /// <summary>
        ///  Gets a data element (form data) from storage and performs business logic on it (e.g. to calculate certain fields) before it is returned.
        ///  If more there are more data elements of the same dataType only the first one is returned. In that case use the more spesific
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

            if (appModel == null)
            {
                return BadRequest($"Did not find form data for data element {dataGuid}");
            }

            // we need to save a copy to detect changes if dataProcessRead changes the model
            byte[] beforeProcessDataRead = JsonSerializer.SerializeToUtf8Bytes(appModel);

            foreach (var dataProcessor in _dataProcessors)
            {
                _logger.LogInformation(
                    "ProcessDataRead for {modelType} using {dataProcesor}",
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
            if (
                !dataElement.Locked
                && !beforeProcessDataRead.SequenceEqual(JsonSerializer.SerializeToUtf8Bytes(appModel))
            )
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
                catch (PlatformHttpException e) when (e.Response.StatusCode == HttpStatusCode.Forbidden)
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
            if (userOrgClaim == null || !org.Equals(userOrgClaim, StringComparison.InvariantCultureIgnoreCase))
            {
                await _instanceClient.UpdateReadStatus(instanceOwnerId, instanceGuid, "read");
            }

            return Ok(appModel);
        }

        private async Task<ActionResult> PutBinaryData(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            if (Request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
            {
                var contentDispositionHeader = ContentDispositionHeaderValue.Parse(headerValues.ToString());
                _logger.LogInformation("Content-Disposition: {ContentDisposition}", headerValues.ToString());
                DataElement dataElement = await _dataClient.UpdateBinaryData(
                    new InstanceIdentifier(instanceOwnerPartyId, instanceGuid),
                    Request.ContentType,
                    contentDispositionHeader.FileName.ToString(),
                    dataGuid,
                    Request.Body
                );
                SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);

                return Created(dataElement.SelfLinks.Apps, dataElement);
            }

            return BadRequest("Invalid data provided. Error:  The request must include a Content-Disposition header");
        }

        private async Task<ActionResult> PutFormData(
            string org,
            string app,
            Instance instance,
            Guid dataGuid,
            DataType dataType,
            string? language
        )
        {
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

            string classRef = dataType.AppLogic.ClassRef;
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            ModelDeserializer deserializer = new ModelDeserializer(_logger, _appModel.GetModelType(classRef));
            object? serviceModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

            if (!string.IsNullOrEmpty(deserializer.Error))
            {
                return BadRequest(deserializer.Error);
            }

            if (serviceModel == null)
            {
                return BadRequest("No data found in content");
            }

            Dictionary<string, object?>? changedFields = await JsonHelper.ProcessDataWriteWithDiff(
                instance,
                dataGuid,
                serviceModel,
                language,
                _dataProcessors,
                _logger
            );

            await UpdatePresentationTextsOnInstance(instance, dataType.Id, serviceModel);
            await UpdateDataValuesOnInstance(instance, dataType.Id, serviceModel);

            ObjectUtils.InitializeAltinnRowId(serviceModel);

            // Save Formdata to database
            DataElement updatedDataElement = await _dataClient.UpdateData(
                serviceModel,
                instanceGuid,
                _appModel.GetModelType(classRef),
                org,
                app,
                instanceOwnerPartyId,
                dataGuid
            );

            SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, updatedDataElement, Request);

            string dataUrl = updatedDataElement.SelfLinks.Apps;
            if (changedFields is not null)
            {
                CalculationResult calculationResult = new(updatedDataElement) { ChangedFields = changedFields };
                return Ok(calculationResult);
            }

            return Created(dataUrl, updatedDataElement);
        }

        private async Task UpdatePresentationTextsOnInstance(Instance instance, string dataType, object serviceModel)
        {
            var updatedValues = DataHelper.GetUpdatedDataValues(
                (await _appMetadata.GetApplicationMetadata()).PresentationFields,
                instance.PresentationTexts,
                dataType,
                serviceModel
            );

            if (updatedValues.Count > 0)
            {
                await _instanceClient.UpdatePresentationTexts(
                    int.Parse(instance.Id.Split("/")[0]),
                    Guid.Parse(instance.Id.Split("/")[1]),
                    new PresentationTexts { Texts = updatedValues }
                );
            }
        }

        private async Task UpdateDataValuesOnInstance(Instance instance, string dataType, object serviceModel)
        {
            var updatedValues = DataHelper.GetUpdatedDataValues(
                (await _appMetadata.GetApplicationMetadata()).DataFields,
                instance.DataValues,
                dataType,
                serviceModel
            );

            if (updatedValues.Count > 0)
            {
                await _instanceClient.UpdateDataValues(
                    int.Parse(instance.Id.Split("/")[0]),
                    Guid.Parse(instance.Id.Split("/")[1]),
                    new DataValues { Values = updatedValues }
                );
            }
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

        private static bool InstanceIsActive(Instance i)
        {
            if (i?.Status?.Archived != null || i?.Status?.SoftDeleted != null || i?.Status?.HardDeleted != null)
            {
                return false;
            }

            return true;
        }

        private static bool IsValidContributer(DataType dataType, ClaimsPrincipal user)
        {
            if (dataType.AllowedContributers == null || dataType.AllowedContributers.Count == 0)
            {
                return true;
            }

            foreach (string item in dataType.AllowedContributers)
            {
                string key = item.Split(':')[0];
                string value = item.Split(':')[1];

                switch (key.ToLower())
                {
                    case "org":
                        if (value.Equals(user.GetOrg(), StringComparison.OrdinalIgnoreCase))
                        {
                            return true;
                        }

                        break;
                    case "orgno":
                        if (value.Equals(user.GetOrgNumber().ToString()))
                        {
                            return true;
                        }

                        break;
                    default:
                        break;
                }
            }

            return false;
        }

        private ObjectResult Problem(DataPatchError error)
        {
            int code = error.ErrorType switch
            {
                DataPatchErrorType.PatchTestFailed => (int)HttpStatusCode.Conflict,
                DataPatchErrorType.DeserializationFailed => (int)HttpStatusCode.UnprocessableContent,
                _ => (int)HttpStatusCode.InternalServerError
            };
            return StatusCode(
                code,
                new ProblemDetails()
                {
                    Title = error.Title,
                    Detail = error.Detail,
                    Type = "https://datatracker.ietf.org/doc/html/rfc6902/",
                    Status = code,
                    Extensions = error.Extensions ?? new Dictionary<string, object?>(StringComparer.Ordinal)
                }
            );
        }
    }
}
