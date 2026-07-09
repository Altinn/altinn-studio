#nullable disable

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Extensions;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

namespace Altinn.Platform.Storage.Controllers;

/// <summary>
/// API for managing the data elements of an instance
/// </summary>
[Route("storage/api/v1/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
[ApiController]
public class DataController : ControllerBase
{
    private const long RequestSizeLimit = 2000 * 1024 * 1024;

    private static readonly FormOptions _defaultFormOptions = new();

    private readonly IDataRepository _dataRepository;
    private readonly IBlobRepository _blobRepository;
    private readonly IInstanceRepository _instanceRepository;
    private readonly IApplicationRepository _applicationRepository;
    private readonly IDataService _dataService;
    private readonly IInstanceEventService _instanceEventService;
    private readonly IOnDemandClient _onDemandClient;
    private readonly string _storageBaseAndHost;
    private readonly GeneralSettings _generalSettings;
    private readonly IAuthorization _authorizationService;

    /// <summary>
    /// Initializes a new instance of the <see cref="DataController"/> class
    /// </summary>
    /// <param name="dataRepository">the data repository handler</param>
    /// <param name="blobRepository">the blob repository handler</param>
    /// <param name="instanceRepository">the instance repository</param>
    /// <param name="applicationRepository">the application repository</param>
    /// <param name="dataService">A data service with data element related business logic.</param>
    /// <param name="instanceEventService">An instance event service with event related business logic.</param>
    /// <param name="generalSettings">the general settings.</param>
    /// <param name="onDemandClient">the ondemand client</param>
    /// <param name="authorizationService">The authorization service</param>
    public DataController(
        IDataRepository dataRepository,
        IBlobRepository blobRepository,
        IInstanceRepository instanceRepository,
        IApplicationRepository applicationRepository,
        IDataService dataService,
        IInstanceEventService instanceEventService,
        IOptions<GeneralSettings> generalSettings,
        IOnDemandClient onDemandClient,
        IAuthorization authorizationService
    )
    {
        _dataRepository = dataRepository;
        _blobRepository = blobRepository;
        _instanceRepository = instanceRepository;
        _applicationRepository = applicationRepository;
        _dataService = dataService;
        _instanceEventService = instanceEventService;
        _storageBaseAndHost = $"{generalSettings.Value.Hostname}/storage/api/v1/";
        _onDemandClient = onDemandClient;
        _generalSettings = generalSettings.Value;
        _authorizationService = authorizationService;
    }

    /// <summary>
    /// Deletes a specific data element.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
    /// <param name="dataGuid">The id of the data element to delete.</param>
    /// <param name="delay">A boolean to indicate if the delete should be immediate or delayed following Altinn's business logic</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The metadata of the deleted data element.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpDelete("data/{dataGuid:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/json")]
    public async Task<ActionResult<DataElement>> Delete(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        [FromQuery] bool delay,
        CancellationToken cancellationToken
    )
    {
        (Instance instance, _, ActionResult instanceError) = await GetInstanceAsync(
            instanceGuid,
            instanceOwnerPartyId,
            false,
            cancellationToken
        );
        if (instance == null)
        {
            return instanceError;
        }

        (DataElement dataElement, ActionResult dataElementError) = await GetDataElementAsync(
            instanceGuid,
            dataGuid,
            cancellationToken
        );
        if (dataElement == null)
        {
            return dataElementError;
        }

        bool appOwnerDeletingElement = User.GetOrg() == instance.Org;

        if (!appOwnerDeletingElement && dataElement.DeleteStatus?.IsHardDeleted == true)
        {
            return NotFound();
        }
        else if (
            delay
            && appOwnerDeletingElement
            && dataElement.DeleteStatus?.IsHardDeleted == true
        )
        {
            return dataElement;
        }

        (Application application, ActionResult applicationError) = await GetApplicationAsync(
            instance.AppId,
            instance.Org,
            cancellationToken
        );
        if (application == null)
        {
            return applicationError;
        }

        (DataType dataTypeDefinition, ActionResult dataTypeError) = await GetDataTypeAsync(
            instance,
            dataElement.DataType,
            application,
            cancellationToken
        );
        if (dataTypeDefinition == null)
        {
            return dataTypeError;
        }

        if (await dataTypeDefinition.CanWrite(_authorizationService, instance) is not true)
        {
            return Forbid();
        }

        (VersionPreconditions preconditions, ActionResult versionError) =
            VersionPreconditionHelper.TryParse(Request);
        if (versionError is not null)
        {
            return versionError;
        }

        dataElement.LastChangedBy = User.GetUserOrOrgNo();

        if (delay)
        {
            if (dataTypeDefinition.AppLogic?.AutoDeleteOnProcessEnd != true)
            {
                return BadRequest(
                    $"DataType {dataElement.DataType} does not support delayed deletion"
                );
            }

            return await InitiateDelayedDelete(instance, dataElement, preconditions);
        }

        DataElementWriteResult<DataElement> deleteResult;
        try
        {
            deleteResult = await _dataService.DeleteImmediately(
                instance,
                dataElement,
                application.StorageAccountNumber,
                preconditions.InstanceVersion,
                preconditions.ProcessStateVersion
            );
        }
        catch (StorageVersionMismatchException exception)
        {
            return VersionPreconditionHelper.VersionMismatch(Response, exception);
        }

        VersionPreconditionHelper.WriteVersionResponseHeaders(Response, deleteResult);
        return Ok(dataElement);
    }

    /// <summary>
    /// Gets a data file from storage. The content type is the same as the file was stored with.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
    /// <param name="dataGuid">The id of the data element to retrieve.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The data file as a stream.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [HttpGet("data/{dataGuid:guid}")]
    [RequestSizeLimit(RequestSizeLimit)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/json")]
    public async Task<ActionResult> Get(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        CancellationToken cancellationToken
    )
    {
        if (instanceOwnerPartyId == 0)
        {
            return BadRequest("Missing parameter value: instanceOwnerPartyId can not be empty");
        }

        (Instance instance, _, ActionResult instanceError) = await GetInstanceAsync(
            instanceGuid,
            instanceOwnerPartyId,
            false,
            cancellationToken
        );
        if (instance == null)
        {
            return instanceError;
        }

        (DataElement dataElement, ActionResult dataElementError) = await GetDataElementAsync(
            instanceGuid,
            dataGuid,
            cancellationToken
        );
        if (dataElement == null)
        {
            return dataElementError;
        }

        (Application application, ActionResult applicationError) = await GetApplicationAsync(
            instance.AppId,
            instance.Org,
            cancellationToken
        );
        if (application == null)
        {
            return applicationError;
        }

        (DataType dataTypeDefinition, ActionResult dataTypeError) = await GetDataTypeAsync(
            instance,
            dataElement.DataType,
            application,
            cancellationToken
        );
        if (dataTypeDefinition == null)
        {
            return dataTypeError;
        }

        if (await dataTypeDefinition.CanRead(_authorizationService, instance) is not true)
        {
            return Forbid();
        }

        bool appOwnerRequestingElement = User.GetOrg() == instance.Org;

        if (dataElement.DeleteStatus?.IsHardDeleted == true && !appOwnerRequestingElement)
        {
            return NotFound();
        }

        if (!dataElement.IsRead && !appOwnerRequestingElement)
        {
            await _dataRepository.UpdateReadStatus(
                instanceGuid,
                dataGuid,
                true,
                cancellationToken
            );
        }

        string currentBlobVersion = await _dataRepository.ReadCurrentBlobVersion(
            instanceGuid,
            dataGuid,
            cancellationToken
        );

        if (
            (instance.AppId.Contains(@"/a1-") || instance.AppId.Contains(@"/a2-"))
            && _generalSettings.A2UseTtdAsServiceOwner
        )
        {
            instance.Org = "ttd";
        }

        VersionPreconditionHelper.WriteVersionResponseHeaders(
            Response,
            await _instanceRepository.ReadVersions(instanceGuid, cancellationToken)
        );

        if (HasExpectedBlobStoragePath(dataElement, currentBlobVersion, instance.AppId, instanceGuid, dataGuid))
        {
            Stream dataStream = await _blobRepository.ReadBlob(
                instance.Org,
                dataElement.BlobStoragePath,
                application.StorageAccountNumber,
                cancellationToken
            );

            if (dataStream == null)
            {
                return NotFound($"Unable to read data element from blob storage for {dataGuid}");
            }

            SetBlobVersionETag(currentBlobVersion);

            // Migrated Altinn 2 Websa main forms should be shown inline in the browser
            if (
                instance.AppId.Contains(@"/a2-")
                && dataElement.DataType == "ref-data-as-pdf"
                && dataElement.ContentType == "text/html"
            )
            {
                var contentDispositionHeader = new ContentDispositionHeaderValue("inline");
                contentDispositionHeader.SetHttpFileName(dataElement.Filename);
                Response.Headers.Append(
                    HeaderNames.ContentDisposition,
                    contentDispositionHeader.ToString()
                );
                return File(dataStream, dataElement.ContentType);
            }

            return File(dataStream, dataElement.ContentType, dataElement.Filename);
        }
        else if (dataElement.BlobStoragePath.StartsWith("ondemand"))
        {
            var contentDispositionHeader = new ContentDispositionHeaderValue("inline");
            contentDispositionHeader.SetHttpFileName(dataElement.Filename);
            Response.Headers.Append(
                HeaderNames.ContentDisposition,
                contentDispositionHeader.ToString()
            );

            return File(
                await _onDemandClient.GetStreamAsync(
                    $"ondemand/{instance.AppId}/{instanceOwnerPartyId}/{instanceGuid}/{dataGuid}/"
                        + $"{LanguageHelper.GetCurrentUserLanguage(Request)}/{dataElement.BlobStoragePath.Split('/')[1]}"
                ),
                dataElement.ContentType
            );
        }

        return NotFound("Unable to find requested data item");
    }

    /// <summary>
    /// Returns a list of data elements of an instance.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The list of data elements</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [HttpGet("dataelements")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Produces("application/json")]
    public async Task<ActionResult<DataElementList>> GetMany(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        if (instanceOwnerPartyId == 0)
        {
            return BadRequest("Missing parameter value: instanceOwnerPartyId can not be empty");
        }

        (Instance instance, _, ActionResult instanceError) = await GetInstanceAsync(
            instanceGuid,
            instanceOwnerPartyId,
            true,
            cancellationToken
        );
        if (instance == null)
        {
            return instanceError;
        }

        bool appOwnerRequestingElement = User.GetOrg() == instance.Org;
        instance.Data = appOwnerRequestingElement
            ? instance.Data
            : instance.Data.Where(de => de.DeleteStatus is not { IsHardDeleted: true }).ToList();

        VersionPreconditionHelper.WriteVersionResponseHeaders(
            Response,
            await _instanceRepository.ReadVersions(instanceGuid, cancellationToken)
        );

        return Ok(new DataElementList() { DataElements = instance.Data });
    }

    /// <summary>
    /// Create and save the data element. The StreamContent.Headers.ContentDisposition.FileName property shall be used to set the filename on client side
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
    /// <param name="dataType">The data type identifier for the data being uploaded.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <param name="refs">An optional array of data element references.</param>
    /// <param name="generatedFromTask">An optional id of the task the data element was generated from</param>
    /// <returns>The metadata of the new data element.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPost("data")]
    [DisableFormValueModelBinding]
    [RequestSizeLimit(RequestSizeLimit)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Produces("application/json")]
    public async Task<ActionResult<DataElement>> CreateAndUploadData(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string dataType,
        CancellationToken cancellationToken,
        [FromQuery(Name = "refs")] List<Guid> refs = null,
        [FromQuery(Name = "generatedFromTask")] string generatedFromTask = null
    )
    {
        if (instanceOwnerPartyId == 0 || string.IsNullOrEmpty(dataType) || Request.Body == null)
        {
            return BadRequest(
                "Missing parameter values: instanceId, elementType or attached file content cannot be null"
            );
        }

        (Instance instance, long instanceInternalId, ActionResult instanceError) =
            await GetInstanceAsync(instanceGuid, instanceOwnerPartyId, false, cancellationToken);
        if (instance == null)
        {
            return instanceError;
        }

        (Application application, ActionResult applicationError) = await GetApplicationAsync(
            instance.AppId,
            instance.Org,
            cancellationToken
        );
        if (application == null)
        {
            return applicationError;
        }

        (DataType dataTypeDefinition, ActionResult dataTypeError) = await GetDataTypeAsync(
            instance,
            dataType,
            application,
            cancellationToken
        );
        if (dataTypeDefinition == null)
        {
            return dataTypeError;
        }

        if (await dataTypeDefinition.CanWrite(_authorizationService, instance) is not true)
        {
            return Forbid();
        }

        (VersionPreconditions preconditions, ActionResult versionError) =
            VersionPreconditionHelper.TryParse(Request);
        if (versionError is not null)
        {
            return versionError;
        }

        var streamAndDataElement = await ReadRequestAndCreateDataElementAsync(
            Request,
            dataType,
            refs,
            generatedFromTask,
            instance
        );
        Stream theStream = streamAndDataElement.Stream;
        DataElement newData = streamAndDataElement.DataElement;

#if LOCALTEST
        newData.FileScanResult = dataTypeDefinition.EnableFileScan
            ? FileScanResult.Clean
            : FileScanResult.NotApplicable;
#else
        newData.FileScanResult = dataTypeDefinition.EnableFileScan
            ? FileScanResult.Pending
            : FileScanResult.NotApplicable;
#endif

        if (theStream == null)
        {
            return BadRequest("No data attachments found");
        }

        newData.Filename = HttpUtility.UrlDecode(newData.Filename);
        string blobVersionId = await _dataRepository.CreateBlobVersionId(
            instanceGuid,
            Guid.Parse(newData.Id),
            instance.AppId,
            instance.Org,
            application.StorageAccountNumber,
            cancellationToken
        );
        string versionedBlobStoragePath = BlobRepository.GetVersionedBlobPath(
            instance.AppId,
            instanceGuid.ToString(),
            blobVersionId
        );
        newData.BlobStoragePath = versionedBlobStoragePath;

        long length;
        DateTimeOffset blobTimestamp;
        try
        {
            (length, blobTimestamp) = await _blobRepository.WriteBlob(
                instance.Org,
                theStream,
                newData.BlobStoragePath,
                application.StorageAccountNumber
            );
        }
        catch
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                Guid.Parse(newData.Id),
                versionedBlobStoragePath,
                blobVersionId,
                application.StorageAccountNumber
            );
            throw;
        }

        if (length == 0L)
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                Guid.Parse(newData.Id),
                versionedBlobStoragePath,
                blobVersionId,
                application.StorageAccountNumber
            );
            return BadRequest("Empty stream provided. Cannot persist data.");
        }

        newData.Size = length;

        if (User.GetOrg() == instance.Org)
        {
            newData.IsRead = false;
        }

        DataElementWriteResult<DataElement> createResult;
        try
        {
            createResult = await _dataRepository.Create(
                newData,
                instanceInternalId,
                cancellationToken,
                preconditions.InstanceVersion,
                preconditions.ProcessStateVersion
            );
        }
        catch (StorageVersionMismatchException exception)
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                Guid.Parse(newData.Id),
                versionedBlobStoragePath,
                blobVersionId,
                application.StorageAccountNumber
            );
            return VersionPreconditionHelper.VersionMismatch(Response, exception);
        }

        DataElement dataElement = createResult.DataElement;
        dataElement.SetPlatformSelfLinks(_storageBaseAndHost, instanceOwnerPartyId);
        VersionPreconditionHelper.WriteVersionResponseHeaders(Response, createResult);

        await _dataService.StartFileScan(
            instance,
            dataTypeDefinition,
            dataElement,
            blobTimestamp,
            application.StorageAccountNumber,
            CancellationToken.None
        );

        await _instanceEventService.DispatchEvent(InstanceEventType.Created, instance, dataElement);

        return Created(dataElement.SelfLinks.Platform, dataElement);
    }

    /// <summary>
    /// Replaces an existing data element with the attached file. The StreamContent.Headers.ContentDisposition.FileName property shall be used to set the filename on client side
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
    /// <param name="dataGuid">The id of the data element to replace.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <param name="refs">An optional array of data element references.</param>
    /// <param name="generatedFromTask">An optional id of the task the data element was generated from</param>
    /// <returns>The metadata of the updated data element.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPut("data/{dataGuid}")]
    [DisableFormValueModelBinding]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [Produces("application/json")]
    public async Task<ActionResult<DataElement>> OverwriteData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        CancellationToken cancellationToken,
        [FromQuery(Name = "refs")] List<Guid> refs = null,
        [FromQuery(Name = "generatedFromTask")] string generatedFromTask = null
    )
    {
        if (instanceOwnerPartyId == 0 || Request.Body == null)
        {
            return BadRequest(
                "Missing parameter values: instanceId, datafile or attached file content cannot be empty"
            );
        }

        (Instance instance, _, ActionResult instanceError) = await GetInstanceAsync(
            instanceGuid,
            instanceOwnerPartyId,
            false,
            cancellationToken
        );
        if (instance == null)
        {
            return instanceError;
        }

        (Application application, ActionResult applicationError) = await GetApplicationAsync(
            instance.AppId,
            instance.Org,
            cancellationToken
        );
        if (application == null)
        {
            return applicationError;
        }

        (DataElement dataElement, ActionResult dataElementError) = await GetDataElementAsync(
            instanceGuid,
            dataGuid,
            cancellationToken
        );
        if (dataElement == null)
        {
            return dataElementError;
        }

        (DataType dataTypeDefinition, ActionResult dataTypeError) = await GetDataTypeAsync(
            instance,
            dataElement.DataType,
            application,
            cancellationToken
        );
        if (dataTypeDefinition == null)
        {
            return dataTypeError;
        }

        if (await dataTypeDefinition.CanWrite(_authorizationService, instance) is not true)
        {
            return Forbid();
        }

        if (dataElement.Locked)
        {
            return Conflict($"Data element {dataGuid} is locked and cannot be updated");
        }

        if (dataElement.DeleteStatus?.IsHardDeleted == true)
        {
            return Conflict($"Data element {dataGuid} is deleted and cannot be updated");
        }

        (VersionPreconditions preconditions, ActionResult versionError) =
            VersionPreconditionHelper.TryParse(Request);
        if (versionError is not null)
        {
            return versionError;
        }

        string currentBlobVersion = await _dataRepository.ReadCurrentBlobVersion(
            instanceGuid,
            dataGuid,
            cancellationToken
        );

        if (!HasExpectedBlobStoragePath(dataElement, currentBlobVersion, instance.AppId, instanceGuid, dataGuid))
        {
            return StatusCode(500, "Storage url does not match with instance metadata");
        }

        (string ifMatchBlobVersion, ActionResult ifMatchError) = TryGetIfMatchBlobVersion();
        if (ifMatchError is not null)
        {
            return ifMatchError;
        }

        string expectedCurrentBlobVersion = ifMatchBlobVersion ?? currentBlobVersion;
        bool explicitIfMatch = ifMatchBlobVersion is not null;

        var streamAndDataElement = await ReadRequestAndCreateDataElementAsync(
            Request,
            dataElement.DataType,
            refs,
            generatedFromTask,
            instance
        );
        Stream theStream = streamAndDataElement.Stream;
        DataElement updatedData = streamAndDataElement.DataElement;

        if (theStream == null)
        {
            return BadRequest("No data found in request body");
        }

        DateTime changedTime = DateTime.UtcNow;

        string blobVersionId = await _dataRepository.CreateBlobVersionId(
            instanceGuid,
            dataGuid,
            instance.AppId,
            instance.Org,
            application.StorageAccountNumber,
            cancellationToken
        );
        string versionedBlobStoragePath = BlobRepository.GetVersionedBlobPath(
            instance.AppId,
            instanceGuid.ToString(),
            blobVersionId
        );

        long blobSize;
        DateTimeOffset blobTimestamp;
        try
        {
            (blobSize, blobTimestamp) = await _blobRepository.WriteBlob(
                instance.Org,
                theStream,
                versionedBlobStoragePath,
                application.StorageAccountNumber
            );
        }
        catch
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                dataGuid,
                versionedBlobStoragePath,
                blobVersionId,
                application.StorageAccountNumber
            );
            throw;
        }

        if (blobSize == 0)
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                dataGuid,
                versionedBlobStoragePath,
                blobVersionId,
                application.StorageAccountNumber
            );
            return UnprocessableEntity("Could not process attached file");
        }

        var updatedProperties = new Dictionary<string, object>()
        {
            { "/contentType", updatedData.ContentType },
            { "/filename", HttpUtility.UrlDecode(updatedData.Filename) },
            { "/lastChangedBy", User.GetUserOrOrgNo() },
            { "/lastChanged", changedTime },
            { "/refs", updatedData.Refs },
            { "/references", updatedData.References },
            { "/size", blobSize },
            { "/blobStoragePath", versionedBlobStoragePath },
            { "/currentBlobVersion", blobVersionId },
        };

        if (User.GetOrg() == instance.Org)
        {
            updatedProperties.Add("/isRead", false);
        }

#if LOCALTEST
        FileScanResult scanResult = dataTypeDefinition.EnableFileScan
            ? FileScanResult.Clean
            : FileScanResult.NotApplicable;
#else
        FileScanResult scanResult = dataTypeDefinition.EnableFileScan
            ? FileScanResult.Pending
            : FileScanResult.NotApplicable;
#endif

        updatedProperties.Add("/fileScanResult", scanResult);

        DataElementWriteResult<DataElement> updateResult;
        try
        {
            updateResult = await _dataRepository.Update(
                instanceGuid,
                dataGuid,
                updatedProperties,
                new DataElementUpdateContext
                {
                    EnforceLockCheck = true,
                    ExpectedCurrentBlobVersion = expectedCurrentBlobVersion,
                    ExpectedInstanceVersion = preconditions.InstanceVersion,
                    ExpectedProcessStateVersion = preconditions.ProcessStateVersion,
                },
                cancellationToken
            );
        }
        catch (DataElementBlobVersionMismatchException exception)
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                dataGuid,
                versionedBlobStoragePath,
                blobVersionId,
                application.StorageAccountNumber
            );
            if (explicitIfMatch)
            {
                return StatusCode(StatusCodes.Status412PreconditionFailed, exception.Message);
            }

            return Conflict(exception.Message);
        }
        catch (StorageVersionMismatchException exception)
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                dataGuid,
                versionedBlobStoragePath,
                blobVersionId,
                application.StorageAccountNumber
            );
            return VersionPreconditionHelper.VersionMismatch(Response, exception);
        }
        catch (RepositoryException exception)
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                dataGuid,
                versionedBlobStoragePath,
                blobVersionId,
                application.StorageAccountNumber
            );
            if (exception.StatusCodeSuggestion.HasValue)
            {
                return StatusCode((int)exception.StatusCodeSuggestion.Value, exception.Message);
            }

            throw;
        }

        DataElement updatedElement = updateResult.DataElement;
        updatedElement.SetPlatformSelfLinks(_storageBaseAndHost, instanceOwnerPartyId);
        SetBlobVersionETag(blobVersionId);
        VersionPreconditionHelper.WriteVersionResponseHeaders(Response, updateResult);

        await _dataService.StartFileScan(
            instance,
            dataTypeDefinition,
            dataElement,
            blobTimestamp,
            application.StorageAccountNumber,
            CancellationToken.None
        );

        await _instanceEventService.DispatchEvent(
            InstanceEventType.Saved,
            instance,
            updatedElement
        );

        return Ok(updatedElement);
    }

    /// <summary>
    /// Replaces the existing metadata for a data element with the new data element.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
    /// <param name="dataGuid">The id of the data element to update.</param>
    /// <param name="dataElement">The new metadata for the data element.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The updated data element.</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPut("dataelements/{dataGuid}")]
    [Consumes("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Produces("application/json")]
    public async Task<ActionResult<DataElement>> Update(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        [FromBody] DataElement dataElement,
        CancellationToken cancellationToken
    )
    {
        if (
            !instanceGuid.ToString().Equals(dataElement.InstanceGuid)
            || !dataGuid.ToString().Equals(dataElement.Id)
        )
        {
            return BadRequest("Mismatch between path and dataElement content");
        }

        (Instance instance, _, ActionResult instanceError) = await GetInstanceAsync(
            instanceGuid,
            instanceOwnerPartyId,
            false,
            cancellationToken
        );
        if (instance == null)
        {
            return instanceError;
        }

        (DataType dataTypeDefinition, ActionResult dataTypeError) = await GetDataTypeAsync(
            instance,
            dataElement.DataType,
            cancellationToken: cancellationToken
        );
        if (dataTypeDefinition is null)
        {
            return dataTypeError;
        }

        if (await dataTypeDefinition.CanWrite(_authorizationService, instance) is not true)
        {
            return Forbid();
        }

        (VersionPreconditions preconditions, ActionResult versionError) =
            VersionPreconditionHelper.TryParse(Request);
        if (versionError is not null)
        {
            return versionError;
        }

        Dictionary<string, object> propertyList = new()
        {
            { "/locked", dataElement.Locked },
            { "/refs", dataElement.Refs },
            { "/references", dataElement.References },
            { "/tags", dataElement.Tags },
            { "/userDefinedMetadata", dataElement.UserDefinedMetadata },
            { "/metadata", dataElement.Metadata },
            { "/deleteStatus", dataElement.DeleteStatus },
            { "/lastChanged", dataElement.LastChanged },
            { "/lastChangedBy", dataElement.LastChangedBy },
        };

        DataElementWriteResult<DataElement> updateResult;
        try
        {
            updateResult = await _dataRepository.Update(
                instanceGuid,
                dataGuid,
                propertyList,
                new DataElementUpdateContext
                {
                    ExpectedInstanceVersion = preconditions.InstanceVersion,
                    ExpectedProcessStateVersion = preconditions.ProcessStateVersion,
                },
                cancellationToken
            );
        }
        catch (StorageVersionMismatchException exception)
        {
            return VersionPreconditionHelper.VersionMismatch(Response, exception);
        }

        VersionPreconditionHelper.WriteVersionResponseHeaders(Response, updateResult);
        return Ok(updateResult.DataElement);
    }

    /// <summary>
    /// Sets the file scan status for an existing data element.
    /// </summary>
    /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
    /// <param name="dataGuid">The id of the data element to update.</param>
    /// <param name="fileScanStatus">The file scan results for this data element.</param>
    /// <returns>The updated data element.</returns>
    [Authorize(Policy = "PlatformAccess")]
    [HttpPut("dataelements/{dataGuid}/filescanstatus")]
    [Consumes("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Produces("application/json")]
    public async Task<ActionResult> SetFileScanStatus(
        Guid instanceGuid,
        Guid dataGuid,
        [FromBody] FileScanStatus fileScanStatus
    )
    {
        DataElementWriteResult<DataElement> updateResult = await _dataRepository.UpdateFileScanStatus(
            instanceGuid,
            dataGuid,
            fileScanStatus
        );

        VersionPreconditionHelper.WriteVersionResponseHeaders(Response, updateResult);
        return Ok();
    }

    /// <summary>
    /// Creates a data element by reading the first multipart element or body of the request.
    /// </summary>
    private async Task<(
        Stream Stream,
        DataElement DataElement
    )> ReadRequestAndCreateDataElementAsync(
        HttpRequest request,
        string elementType,
        List<Guid> refs,
        string generatedForTask,
        Instance instance
    )
    {
        DateTime creationTime = DateTime.UtcNow;

        (Stream theStream, string contentType, string contentFileName, long fileSize) =
            await DataElementHelper.GetStream(
                request,
                _defaultFormOptions.MultipartBoundaryLengthLimit
            );

        string user = User.GetUserOrOrgNo();

        DataElement newData = DataElementHelper.CreateDataElement(
            elementType,
            refs,
            instance,
            creationTime,
            contentType,
            contentFileName,
            fileSize,
            user,
            generatedForTask
        );

        return (theStream, newData);
    }

    private async Task<(Application Application, ActionResult ErrorMessage)> GetApplicationAsync(
        string appId,
        string org,
        CancellationToken cancellationToken = default
    )
    {
        Application application = await _applicationRepository.FindOne(
            appId,
            org,
            cancellationToken
        );

        return application is null
            ? (null, NotFound($"Cannot find application {appId} in storage"))
            : (application, null);
    }

    private async Task<(
        Instance Instance,
        long InternalId,
        ActionResult ErrorMessage
    )> GetInstanceAsync(
        Guid instanceGuid,
        int instanceOwnerPartyId,
        bool includeDataelements,
        CancellationToken cancellationToken
    )
    {
        (Instance instance, long instanceInternalId) = await _instanceRepository.GetOne(
            instanceGuid,
            includeDataelements,
            cancellationToken
        );

        return instance is null
            ? (
                null,
                0,
                NotFound(
                    $"Unable to find any instance with id: {instanceOwnerPartyId}/{instanceGuid}."
                )
            )
            : (instance, instanceInternalId, null);
    }

    private async Task<(DataElement DataElement, ActionResult ErrorMessage)> GetDataElementAsync(
        Guid instanceGuid,
        Guid dataGuid,
        CancellationToken cancellationToken = default
    )
    {
        DataElement dataElement = await _dataRepository.Read(
            instanceGuid,
            dataGuid,
            cancellationToken
        );

        return dataElement is null
            ? (null, NotFound($"Unable to find any data element with id: {dataGuid}."))
            : (dataElement, null);
    }

    private async Task<ActionResult<DataElement>> InitiateDelayedDelete(
        Instance instance,
        DataElement dataElement,
        VersionPreconditions preconditions
    )
    {
        DateTime deletedTime = DateTime.UtcNow;

        DeleteStatus deleteStatus = new() { IsHardDeleted = true, HardDeleted = deletedTime };

        DataElementWriteResult<DataElement> updatedDateElement;
        try
        {
            updatedDateElement = await _dataRepository.Update(
                Guid.Parse(dataElement.InstanceGuid),
                Guid.Parse(dataElement.Id),
                new Dictionary<string, object>()
                {
                    { "/deleteStatus", deleteStatus },
                    { "/lastChanged", deletedTime },
                    { "/lastChangedBy", dataElement.LastChangedBy },
                },
                new DataElementUpdateContext
                {
                    ExpectedInstanceVersion = preconditions.InstanceVersion,
                    ExpectedProcessStateVersion = preconditions.ProcessStateVersion,
                }
            );
        }
        catch (StorageVersionMismatchException exception)
        {
            return VersionPreconditionHelper.VersionMismatch(Response, exception);
        }

        await _instanceEventService.DispatchEvent(InstanceEventType.Deleted, instance, dataElement);
        VersionPreconditionHelper.WriteVersionResponseHeaders(Response, updatedDateElement);
        return Ok(updatedDateElement.DataElement);
    }

    private async Task<(DataType DataType, ActionResult ErrorMessage)> GetDataTypeAsync(
        Instance instance,
        string dataTypeId,
        Application application = null,
        CancellationToken cancellationToken = default
    )
    {
        if (application is null)
        {
            (application, ActionResult applicationError) = await GetApplicationAsync(
                instance.AppId,
                instance.Org,
                cancellationToken
            );
            if (application is null)
            {
                return (null, applicationError);
            }
        }

        DataType dataTypeDefinition = application.DataTypes.FirstOrDefault(e => e.Id == dataTypeId);

        return dataTypeDefinition is null
            ? (null, BadRequest("Requested element type is not declared in application metadata"))
            : (dataTypeDefinition, null);
    }

    private async Task DeleteAllocatedBlobVersion(
        string org,
        Guid instanceGuid,
        Guid dataElementId,
        string blobStoragePath,
        string blobVersionId,
        int? storageAccountNumber
    )
    {
        if (string.IsNullOrEmpty(blobVersionId))
        {
            return;
        }

        if (!string.IsNullOrEmpty(blobStoragePath))
        {
            try
            {
                await _blobRepository.DeleteBlob(org, blobStoragePath, storageAccountNumber);
            }
            catch
            {
                return;
            }
        }

        try
        {
            await _dataRepository.DeleteBlobVersion(
                instanceGuid,
                dataElementId,
                blobVersionId,
                CancellationToken.None
            );
        }
        catch
        {
            // Best-effort compensation must not hide the original upload failure.
        }
    }

    private static bool HasExpectedBlobStoragePath(
        DataElement dataElement,
        string blobVersionId,
        string appId,
        Guid instanceGuid,
        Guid dataGuid
    )
    {
        string blobStoragePath = dataElement.BlobStoragePath;
        if (string.IsNullOrEmpty(blobStoragePath))
        {
            return false;
        }

        string legacyBlobStoragePath = DataElementHelper.DataFileName(
            appId,
            instanceGuid.ToString(),
            dataGuid.ToString()
        );
        if (string.Equals(blobStoragePath, legacyBlobStoragePath, StringComparison.Ordinal))
        {
            return true;
        }

        if (string.IsNullOrEmpty(blobVersionId))
        {
            return false;
        }

        string versionedBlobStoragePath = BlobRepository.GetVersionedBlobPath(
            appId,
            instanceGuid.ToString(),
            blobVersionId
        );
        return string.Equals(blobStoragePath, versionedBlobStoragePath, StringComparison.Ordinal);
    }

    private (string BlobVersionId, ActionResult Error) TryGetIfMatchBlobVersion()
    {
        if (!Request.Headers.ContainsKey(HeaderNames.IfMatch))
        {
            return (null, null);
        }

        if (
            !EntityTagHeaderValue.TryParseList(
                Request.Headers[HeaderNames.IfMatch].ToArray(),
                out IList<EntityTagHeaderValue> ifMatch
            )
            || ifMatch.Count != 1
            || ifMatch[0].IsWeak
            || ifMatch[0].Equals(EntityTagHeaderValue.Any)
        )
        {
            return (null, BadRequest("If-Match must contain exactly one strong ETag."));
        }

        string blobVersionId = ifMatch[0].Tag.Value[1..^1];
        try
        {
            BlobVersionId.Decode(blobVersionId);
        }
        catch (Exception exception) when (exception is ArgumentException or FormatException)
        {
            return (null, BadRequest("If-Match ETag value must be a blob version id."));
        }

        return (blobVersionId, null);
    }

    private void SetBlobVersionETag(string blobVersionId)
    {
        if (string.IsNullOrEmpty(blobVersionId))
        {
            return;
        }

        Response.Headers[HeaderNames.ETag] = new EntityTagHeaderValue(
            $"\"{blobVersionId}\""
        ).ToString();
    }
}
