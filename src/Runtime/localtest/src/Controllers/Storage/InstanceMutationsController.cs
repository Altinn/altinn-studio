#nullable disable

using System.Net;
using System.Text;
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
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Controllers;

[Route("storage/api/v1/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/mutations")]
[ApiController]
public class InstanceMutationsController(
    IDataRepository dataRepository,
    IBlobRepository blobRepository,
    IInstanceRepository instanceRepository,
    IInstanceMutationRepository instanceMutationRepository,
    IApplicationRepository applicationRepository,
    IDataService dataService,
    IInstanceEventService instanceEventService,
    IOptions<GeneralSettings> generalSettings,
    IAuthorization authorizationService,
    IAuthorizationService policyAuthorizationService,
    IProcessAuthorizer processAuthorizer
) : ControllerBase
{
    private const long RequestSizeLimit = 2000 * 1024 * 1024;
    private static readonly FormOptions _defaultFormOptions = new();

    private readonly IDataRepository _dataRepository = dataRepository;
    private readonly IBlobRepository _blobRepository = blobRepository;
    private readonly IInstanceRepository _instanceRepository = instanceRepository;
    private readonly IInstanceMutationRepository _instanceMutationRepository =
        instanceMutationRepository;
    private readonly IApplicationRepository _applicationRepository = applicationRepository;
    private readonly IDataService _dataService = dataService;
    private readonly IInstanceEventService _instanceEventService = instanceEventService;
    private readonly IAuthorization _authorizationService = authorizationService;
    private readonly IAuthorizationService _policyAuthorizationService = policyAuthorizationService;
    private readonly IProcessAuthorizer _processAuthorizer = processAuthorizer;
    private readonly string _storageBaseAndHost =
        $"{generalSettings.Value.Hostname}/storage/api/v1/";

    /// <summary>
    /// Commits a batch of mutations for a single instance.
    /// </summary>
    /// <remarks>
    /// Idempotent replay is admitted after the request body is parsed and the current instance is
    /// read, but before delete authorization and current-state data element validation. Replayed
    /// responses use the instance snapshot returned by LocalTest's mutation repository.
    /// Delete-instance mutations check instance existence before delete authorization, so a missing
    /// instance returns 404 before a possible delete-policy 403.
    /// </remarks>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPost]
    [DisableFormValueModelBinding]
    [RequestSizeLimit(RequestSizeLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = RequestSizeLimit)]
    [Produces("application/json")]
    public async Task<ActionResult<InstanceMutationResponse>> CommitMutation(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        (VersionPreconditions preconditions, ActionResult preconditionError) =
            VersionPreconditionHelper.TryParse(Request);
        if (preconditionError is not null)
        {
            return preconditionError;
        }

        (string idempotencyKey, ActionResult idempotencyKeyError) = TryReadMutationIdempotencyKey(
            preconditions
        );
        if (idempotencyKeyError is not null)
        {
            return idempotencyKeyError;
        }

        if (User.GetUserOrOrgNo() is null)
        {
            return Forbid();
        }

        (
            InstanceMutationRequest mutationRequest,
            Dictionary<string, MutationContentPart> contentParts,
            ActionResult requestError
        ) = await ReadMutationRequest(cancellationToken);
        if (requestError is not null)
        {
            return requestError;
        }

        if (!HasMutationOperations(mutationRequest))
        {
            return BadRequest("The mutation request must contain at least one operation.");
        }

        ActionResult deleteInstanceRequestError = ValidateDeleteInstanceRequest(mutationRequest);
        if (deleteInstanceRequestError is not null)
        {
            return deleteInstanceRequestError;
        }

        (Instance instance, long instanceInternalId) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );
        if (instance is null)
        {
            return NotFound(
                $"Unable to find any instance with id: {instanceOwnerPartyId}/{instanceGuid}."
            );
        }

        InstanceVersionResult currentVersions = await _instanceRepository.ReadVersions(
            instanceGuid,
            cancellationToken
        );
        if (
            !string.IsNullOrWhiteSpace(idempotencyKey)
            && preconditions.InstanceVersion is { } expectedInstanceVersion
            && expectedInstanceVersion != currentVersions.InstanceVersion
        )
        {
            try
            {
                InstanceMutationApplyResult replayAdmission =
                    await _instanceMutationRepository.TryReplayAdmission(
                        instanceGuid,
                        expectedInstanceVersion,
                        currentVersions.InstanceVersion,
                        currentVersions.ProcessStateVersion,
                        idempotencyKey,
                        cancellationToken
                    );
                return BuildMutationResponse(replayAdmission);
            }
            catch (StorageVersionMismatchException exception)
            {
                return VersionPreconditionHelper.VersionMismatch(Response, exception);
            }
            catch (RepositoryException exception) when (exception.StatusCodeSuggestion.HasValue)
            {
                return StatusCode((int)exception.StatusCodeSuggestion.Value, exception.Message);
            }
        }

        ActionResult deleteInstanceAuthorizationError = await AuthorizeDeleteInstanceMutation(
            mutationRequest
        );
        if (deleteInstanceAuthorizationError is not null)
        {
            return deleteInstanceAuthorizationError;
        }

        Application application = await _applicationRepository.FindOne(
            instance.AppId,
            instance.Org,
            cancellationToken
        );
        if (application is null)
        {
            return NotFound($"Cannot find application {instance.AppId} in storage");
        }

        if (mutationRequest.DeleteInstance is not null)
        {
            instance.Status ??= new InstanceStatus();
            if (InstanceHelper.IsPreventedFromDeletion(instance.Status, application))
            {
                return StatusCode(
                    403,
                    "Instance cannot be deleted yet due to application restrictions."
                );
            }
        }

        Dictionary<Guid, DataElement> existingDataElements = (instance.Data ?? []).ToDictionary(
            e => new Guid(e.Id),
            e => e
        );
        ActionResult duplicateDataElementIdError = ValidateDuplicateDataElementMutationIds(
            mutationRequest
        );
        if (duplicateDataElementIdError is not null)
        {
            return duplicateDataElementIdError;
        }

        List<DataElement> createDataElements = [];
        List<InstanceMutationDataElementUpdate> updateDataElements = [];
        List<InstanceMutationDataElementDelete> deleteDataElements = [];
        List<StagedBlob> stagedBlobs = [];
        List<FileScanCandidate> fileScanCandidates = [];
        List<(InstanceEventType EventType, DataElement DataElement)> postCommitEvents = [];
        List<InstanceEvent> mutationInstanceEvents = [];
        List<DataElement> postCommitBlobCleanupDataElements = [];
        InstanceMutationApplyResult applyResult;

        async Task CleanupStagedBlobs()
        {
            foreach (StagedBlob stagedBlob in stagedBlobs)
            {
                await DeleteAllocatedBlobVersion(
                    stagedBlob.Org,
                    stagedBlob.InstanceGuid,
                    stagedBlob.DataElementId,
                    stagedBlob.BlobStoragePath,
                    stagedBlob.BlobVersionId,
                    stagedBlob.StorageAccountNumber
                );
            }
        }

        DateTime mutationLastChanged = DateTime.UtcNow;
        string mutationLastChangedBy = User.GetUserOrOrgNo();

        try
        {
            foreach (
                InstanceMutationCreateDataElement create in mutationRequest.CreateDataElements ?? []
            )
            {
                if (string.IsNullOrWhiteSpace(create.DataType))
                {
                    await CleanupStagedBlobs();
                    return BadRequest("createDataElements[].dataType is required.");
                }

                if (string.IsNullOrWhiteSpace(create.ContentPartName))
                {
                    await CleanupStagedBlobs();
                    return BadRequest("createDataElements[].contentPartName is required.");
                }

                if (
                    !contentParts.TryGetValue(
                        create.ContentPartName,
                        out MutationContentPart contentPart
                    )
                )
                {
                    await CleanupStagedBlobs();
                    return BadRequest(
                        $"No multipart file part named '{create.ContentPartName}' was supplied."
                    );
                }

                (DataType dataType, ActionResult dataTypeError) = await GetDataTypeAsync(
                    instance,
                    create.DataType,
                    application,
                    cancellationToken
                );
                if (dataType is null)
                {
                    await CleanupStagedBlobs();
                    return dataTypeError;
                }

                if (await dataType.CanWrite(_authorizationService, instance) is not true)
                {
                    await CleanupStagedBlobs();
                    return Forbid();
                }

                Guid dataElementId = Guid.NewGuid();
                (
                    string blobVersionId,
                    string blobStoragePath,
                    long size,
                    DateTimeOffset blobTimestamp,
                    ActionResult stageError
                ) = await StageBlob(
                    instance,
                    application,
                    instanceGuid,
                    dataElementId,
                    contentPart,
                    stagedBlobs,
                    cancellationToken
                );
                if (stageError is not null)
                {
                    await CleanupStagedBlobs();
                    return stageError;
                }

                DataElement dataElement = new()
                {
                    Id = dataElementId.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = create.DataType,
                    ContentType = FirstNonEmpty(create.ContentType, contentPart.ContentType),
                    CreatedBy = mutationLastChangedBy,
                    Created = mutationLastChanged,
                    Filename = FirstNonEmpty(
                        create.Filename,
                        HttpUtility.UrlDecode(contentPart.FileName)
                    ),
                    Size = size,
                    Refs = create.Refs,
                    BlobStoragePath = blobStoragePath,
                    FileScanResult = dataType.EnableFileScan
                        ? FileScanResult.Clean
                        : FileScanResult.NotApplicable,
                    Locked = create.Locked ?? false,
                    IsRead = User.GetOrg() != instance.Org,
                    References = CreateGeneratedFromTaskReferences(create.GeneratedFromTask),
                    Metadata = create.Metadata,
                    UserDefinedMetadata = create.UserDefinedMetadata,
                    Tags = create.Tags,
                };

                createDataElements.Add(dataElement);
                fileScanCandidates.Add(new FileScanCandidate(dataElement, dataType, blobTimestamp));
                postCommitEvents.Add((InstanceEventType.Created, dataElement));
            }

            foreach (
                InstanceMutationUpdateDataElement update in mutationRequest.UpdateDataElements ?? []
            )
            {
                if (update.DataElementId == Guid.Empty)
                {
                    await CleanupStagedBlobs();
                    return BadRequest("updateDataElements[].dataElementId is required.");
                }

                if (
                    !existingDataElements.TryGetValue(
                        update.DataElementId,
                        out DataElement dataElement
                    )
                )
                {
                    await CleanupStagedBlobs();
                    return NotFound(
                        $"Unable to find any data element with id: {update.DataElementId}."
                    );
                }

                (string expectedCurrentBlobVersion, ActionResult blobVersionError) =
                    TryNormalizeExpectedCurrentBlobVersion(update.ExpectedCurrentBlobVersion);
                if (blobVersionError is not null)
                {
                    await CleanupStagedBlobs();
                    return blobVersionError;
                }

                (DataType dataType, ActionResult dataTypeError) = await GetDataTypeAsync(
                    instance,
                    dataElement.DataType,
                    application,
                    cancellationToken
                );
                if (dataType is null)
                {
                    await CleanupStagedBlobs();
                    return dataTypeError;
                }

                if (await dataType.CanWrite(_authorizationService, instance) is not true)
                {
                    await CleanupStagedBlobs();
                    return Forbid();
                }

                Dictionary<string, object> propertyList = BuildMetadataPropertyList(update);
                bool hasContentUpdate = !string.IsNullOrWhiteSpace(update.ContentPartName);
                if (hasContentUpdate)
                {
                    if (dataElement.Locked)
                    {
                        await CleanupStagedBlobs();
                        return Conflict(
                            $"Data element {update.DataElementId} is locked and cannot be updated"
                        );
                    }

                    if (dataElement.DeleteStatus?.IsHardDeleted == true)
                    {
                        await CleanupStagedBlobs();
                        return Conflict(
                            $"Data element {update.DataElementId} is deleted and cannot be updated"
                        );
                    }

                    if (
                        !contentParts.TryGetValue(
                            update.ContentPartName,
                            out MutationContentPart contentPart
                        )
                    )
                    {
                        await CleanupStagedBlobs();
                        return BadRequest(
                            $"No multipart file part named '{update.ContentPartName}' was supplied."
                        );
                    }

                    (
                        string blobVersionId,
                        string blobStoragePath,
                        long size,
                        DateTimeOffset blobTimestamp,
                        ActionResult stageError
                    ) = await StageBlob(
                        instance,
                        application,
                        instanceGuid,
                        update.DataElementId,
                        contentPart,
                        stagedBlobs,
                        cancellationToken
                    );
                    if (stageError is not null)
                    {
                        await CleanupStagedBlobs();
                        return stageError;
                    }

                    propertyList["/contentType"] = FirstNonEmpty(
                        update.ContentType,
                        contentPart.ContentType
                    );
                    propertyList["/filename"] = FirstNonEmpty(
                        update.Filename,
                        HttpUtility.UrlDecode(contentPart.FileName)
                    );
                    propertyList["/refs"] = update.Refs;
                    propertyList["/references"] = CreateGeneratedFromTaskReferences(
                        update.GeneratedFromTask
                    );
                    propertyList["/size"] = size;
                    propertyList["/blobStoragePath"] = blobStoragePath;
                    propertyList["/currentBlobVersion"] = blobVersionId;
                    propertyList["/fileScanResult"] = dataType.EnableFileScan
                        ? FileScanResult.Clean
                        : FileScanResult.NotApplicable;

                    if (User.GetOrg() == instance.Org)
                    {
                        propertyList["/isRead"] = false;
                    }

                    DataElement scanElement = CloneDataElementForScan(
                        dataElement,
                        propertyList,
                        blobStoragePath
                    );
                    scanElement.LastChanged = mutationLastChanged;
                    scanElement.LastChangedBy = mutationLastChangedBy;
                    fileScanCandidates.Add(
                        new FileScanCandidate(scanElement, dataType, blobTimestamp)
                    );
                    postCommitEvents.Add((InstanceEventType.Saved, scanElement));
                }

                if (propertyList.Count == 0)
                {
                    await CleanupStagedBlobs();
                    return BadRequest(
                        $"No metadata or content changes were supplied for data element {update.DataElementId}."
                    );
                }

                updateDataElements.Add(
                    new InstanceMutationDataElementUpdate(
                        update.DataElementId,
                        propertyList,
                        expectedCurrentBlobVersion,
                        hasContentUpdate
                    )
                );
            }

            foreach (
                InstanceMutationDeleteDataElement delete in mutationRequest.DeleteDataElements ?? []
            )
            {
                if (delete.DataElementId == Guid.Empty)
                {
                    await CleanupStagedBlobs();
                    return BadRequest("deleteDataElements[].dataElementId is required.");
                }

                if (
                    !existingDataElements.TryGetValue(
                        delete.DataElementId,
                        out DataElement dataElement
                    )
                )
                {
                    await CleanupStagedBlobs();
                    return NotFound(
                        $"Unable to find any data element with id: {delete.DataElementId}."
                    );
                }

                (DataType dataType, ActionResult dataTypeError) = await GetDataTypeAsync(
                    instance,
                    dataElement.DataType,
                    application,
                    cancellationToken
                );
                if (dataType is null)
                {
                    await CleanupStagedBlobs();
                    return dataTypeError;
                }

                if (await dataType.CanWrite(_authorizationService, instance) is not true)
                {
                    await CleanupStagedBlobs();
                    return Forbid();
                }

                dataElement.LastChanged = mutationLastChanged;
                dataElement.LastChangedBy = mutationLastChangedBy;
                deleteDataElements.Add(
                    new InstanceMutationDataElementDelete(dataElement, !delete.IgnoreLock)
                );
                mutationInstanceEvents.Add(
                    _instanceEventService.BuildInstanceEvent(
                        InstanceEventType.Deleted,
                        instance,
                        dataElement
                    )
                );
                postCommitBlobCleanupDataElements.Add(dataElement);
            }

            if (mutationRequest.PresentationTexts?.Count > 0)
            {
                if (!await _processAuthorizer.AuthorizePresentationTextsUpdate(instance))
                {
                    await CleanupStagedBlobs();
                    return Forbid();
                }
            }

            if (mutationRequest.DataValues?.Count > 0)
            {
                if (!await _processAuthorizer.AuthorizeDataValuesUpdate(instance))
                {
                    await CleanupStagedBlobs();
                    return Forbid();
                }
            }

            List<string> instanceUpdateProperties = [];
            if (mutationRequest.PresentationTexts?.Count > 0)
            {
                instanceUpdateProperties.Add(nameof(Instance.PresentationTexts));
            }

            if (mutationRequest.DataValues?.Count > 0)
            {
                instanceUpdateProperties.Add(nameof(Instance.DataValues));
            }

            ProcessState processState = mutationRequest.ProcessState?.State;
            mutationInstanceEvents.AddRange(mutationRequest.ProcessState?.Events ?? []);
            if (processState is not null)
            {
                instanceUpdateProperties.Add(nameof(Instance.Process));
            }

            InstanceStatus instanceStatus = null;
            if (mutationRequest.DeleteInstance is not null)
            {
                instanceStatus = BuildHardDeleteStatus(instance.Status, mutationLastChanged);
                instanceUpdateProperties.Add(nameof(Instance.Status));
                instanceUpdateProperties.Add(nameof(InstanceStatus.IsSoftDeleted));
                instanceUpdateProperties.Add(nameof(InstanceStatus.SoftDeleted));
                instanceUpdateProperties.Add(nameof(InstanceStatus.IsHardDeleted));
                instanceUpdateProperties.Add(nameof(InstanceStatus.HardDeleted));
            }

            // Archiving instance if process was ended
            if (instance.Process?.Ended is null && processState?.Ended is not null)
            {
                instanceStatus ??= instance.Status ?? new InstanceStatus();
                instanceStatus.IsArchived = true;
                instanceStatus.Archived = processState.Ended;
                if (!instanceUpdateProperties.Contains(nameof(Instance.Status)))
                {
                    instanceUpdateProperties.Add(nameof(Instance.Status));
                }

                instanceUpdateProperties.Add(nameof(InstanceStatus.IsArchived));
                instanceUpdateProperties.Add(nameof(InstanceStatus.Archived));
            }

            Instance instanceUpdates = new()
            {
                Id = instance.Id,
                InstanceOwner = instance.InstanceOwner,
                Org = instance.Org,
                AppId = instance.AppId,
                Created = instance.Created,
                Process = processState ?? instance.Process,
                Status = instanceStatus,
                CompleteConfirmations = instance.CompleteConfirmations,
                LastChanged = mutationLastChanged,
                LastChangedBy = mutationLastChangedBy,
                PresentationTexts = mutationRequest.PresentationTexts,
                DataValues = mutationRequest.DataValues,
            };

            if (mutationRequest.DeleteInstance is not null)
            {
                mutationInstanceEvents.Add(
                    _instanceEventService.BuildInstanceEvent(
                        InstanceEventType.Deleted,
                        instanceUpdates
                    )
                );
            }

            InstanceMutationCommit mutation = new(
                createDataElements,
                updateDataElements,
                deleteDataElements,
                instanceUpdates,
                instanceUpdateProperties,
                preconditions.InstanceVersion,
                preconditions.ProcessStateVersion,
                processState,
                mutationInstanceEvents,
                idempotencyKey,
                mutationLastChanged,
                mutationLastChangedBy
            );

            applyResult = await _instanceMutationRepository.Apply(
                instanceGuid,
                instanceInternalId,
                mutation,
                cancellationToken
            );
        }
        catch (StorageVersionMismatchException exception)
        {
            await CleanupStagedBlobs();
            return VersionPreconditionHelper.VersionMismatch(Response, exception);
        }
        catch (DataElementBlobVersionMismatchException exception)
        {
            await CleanupStagedBlobs();
            await WriteVersionResponseHeaders(instanceGuid, cancellationToken);
            return StatusCode(StatusCodes.Status412PreconditionFailed, exception.Message);
        }
        catch (RepositoryException exception) when (exception.StatusCodeSuggestion.HasValue)
        {
            await CleanupStagedBlobs();
            return StatusCode((int)exception.StatusCodeSuggestion.Value, exception.Message);
        }

        if (applyResult.Replayed)
        {
            await CleanupStagedBlobs();
        }

        Instance updatedInstance = applyResult.Instance;
        updatedInstance.SetPlatformSelfLinks(_storageBaseAndHost);

        if (!applyResult.Replayed)
        {
            foreach (FileScanCandidate fileScanCandidate in fileScanCandidates)
            {
                await _dataService.StartFileScan(
                    updatedInstance,
                    fileScanCandidate.DataType,
                    fileScanCandidate.DataElement,
                    fileScanCandidate.BlobTimestamp,
                    application.StorageAccountNumber,
                    CancellationToken.None
                );
            }

            foreach ((InstanceEventType eventType, DataElement dataElement) in postCommitEvents)
            {
                await _instanceEventService.DispatchEvent(eventType, updatedInstance, dataElement);
            }

            foreach (DataElement dataElement in postCommitBlobCleanupDataElements)
            {
                await _dataService.CleanupDeletedDataElementBlobs(
                    updatedInstance,
                    dataElement,
                    application.StorageAccountNumber,
                    CancellationToken.None
                );
            }
        }

        return BuildMutationResponse(applyResult);
    }

    private ActionResult<InstanceMutationResponse> BuildMutationResponse(
        InstanceMutationApplyResult applyResult
    )
    {
        Instance updatedInstance = applyResult.Instance;
        if (updatedInstance is null)
        {
            throw new InvalidOperationException(
                "Instance mutation response requires an instance snapshot."
            );
        }

        updatedInstance.SetPlatformSelfLinks(_storageBaseAndHost);
        WriteVersionResponseHeaders(applyResult.Versions);

        return Ok(
            new InstanceMutationResponse
            {
                Instance = updatedInstance,
                CreatedDataElementIds = [.. applyResult.CreatedDataElementIds],
                Replayed = applyResult.Replayed,
            }
        );
    }

    private async Task<(
        InstanceMutationRequest Request,
        Dictionary<string, MutationContentPart> ContentParts,
        ActionResult Error
    )> ReadMutationRequest(CancellationToken cancellationToken)
    {
        string mutationJson;
        Dictionary<string, MutationContentPart> contentParts = new(StringComparer.Ordinal);

        if (MultipartRequestHelper.IsMultipartContentType(Request.ContentType))
        {
            string boundary;
            try
            {
                boundary = MultipartRequestHelper.GetBoundary(
                    MediaTypeHeaderValue.Parse(Request.ContentType),
                    _defaultFormOptions.MultipartBoundaryLengthLimit
                );
            }
            catch (InvalidDataException exception)
            {
                return (null, null, BadRequest(exception.Message));
            }

            mutationJson = null;
            if (Request.Body.CanSeek)
            {
                Request.Body.Position = 0;
            }

            var multipartReader = new MultipartReader(boundary, Request.Body);
            try
            {
                MultipartSection section;
                while (
                    (section = await multipartReader.ReadNextSectionAsync(cancellationToken))
                        is not null
                )
                {
                    if (
                        !ContentDispositionHeaderValue.TryParse(
                            section.ContentDisposition,
                            out ContentDispositionHeaderValue contentDisposition
                        )
                    )
                    {
                        return (
                            null,
                            null,
                            BadRequest("Multipart section is missing a Content-Disposition header.")
                        );
                    }

                    string name = HeaderUtilities.RemoveQuotes(contentDisposition.Name).Value;
                    if (string.IsNullOrEmpty(name))
                    {
                        return (
                            null,
                            null,
                            BadRequest("Multipart section Content-Disposition is missing a name.")
                        );
                    }

                    if (name == "mutation")
                    {
                        if (mutationJson is not null)
                        {
                            return (
                                null,
                                null,
                                BadRequest(
                                    "Multipart aggregate mutation requests must contain only one 'mutation' field."
                                )
                            );
                        }

                        using var mutationStream = new MemoryStream();
                        await section.Body.CopyToAsync(mutationStream, cancellationToken);
                        mutationJson = Encoding.UTF8.GetString(mutationStream.ToArray());
                        continue;
                    }

                    using var stream = new MemoryStream();
                    await section.Body.CopyToAsync(stream, cancellationToken);
                    var contentPart = new MutationContentPart(
                        stream.ToArray(),
                        section.ContentType,
                        GetMultipartFileName(contentDisposition)
                    );

                    if (!contentParts.TryAdd(name, contentPart))
                    {
                        return (
                            null,
                            null,
                            BadRequest(
                                $"Multipart file part name '{name}' was supplied more than once."
                            )
                        );
                    }
                }
            }
            catch (InvalidDataException exception)
            {
                return (null, null, BadRequest($"Malformed multipart body: {exception.Message}"));
            }
            catch (IOException exception)
            {
                return (
                    null,
                    null,
                    BadRequest($"Error reading multipart body: {exception.Message}")
                );
            }

            if (mutationJson is null)
            {
                return (
                    null,
                    null,
                    BadRequest(
                        "Multipart aggregate mutation requests must contain one 'mutation' JSON field."
                    )
                );
            }
        }
        else if (
            Request.ContentType?.StartsWith("application/json", StringComparison.OrdinalIgnoreCase)
            == true
        )
        {
            using StreamReader reader = new(Request.Body);
            mutationJson = await reader.ReadToEndAsync(cancellationToken);
        }
        else
        {
            return (
                null,
                null,
                BadRequest(
                    "Aggregate mutation requests must be application/json or multipart/form-data."
                )
            );
        }

        try
        {
            InstanceMutationRequest request =
                JsonConvert.DeserializeObject<InstanceMutationRequest>(mutationJson);
            return request is null
                ? (null, null, BadRequest("The mutation request body is required."))
                : (request, contentParts, null);
        }
        catch (JsonException exception)
        {
            return (
                null,
                null,
                BadRequest($"Unable to parse mutation request JSON: {exception.Message}")
            );
        }
    }

    private static string GetMultipartFileName(ContentDispositionHeaderValue contentDisposition)
    {
        string fileName = HeaderUtilities.RemoveQuotes(contentDisposition.FileNameStar).Value;
        if (string.IsNullOrEmpty(fileName))
        {
            fileName = HeaderUtilities.RemoveQuotes(contentDisposition.FileName).Value;
        }

        return string.IsNullOrEmpty(fileName) ? null : fileName;
    }

    private static bool HasMutationOperations(InstanceMutationRequest request) =>
        request.CreateDataElements?.Count > 0
        || request.UpdateDataElements?.Count > 0
        || request.DeleteDataElements?.Count > 0
        || request.DeleteInstance is not null
        || request.DataValues?.Count > 0
        || request.PresentationTexts?.Count > 0
        || request.ProcessState?.State is not null
        || request.ProcessState?.Events?.Count > 0;

    private ActionResult ValidateDeleteInstanceRequest(InstanceMutationRequest request)
    {
        if (request.DeleteInstance is null)
        {
            return null;
        }

        if (!request.DeleteInstance.Hard)
        {
            return BadRequest("deleteInstance.hard must be true.");
        }

        if (
            request.CreateDataElements?.Count > 0
            || request.UpdateDataElements?.Count > 0
            || request.DeleteDataElements?.Count > 0
            || request.DataValues?.Count > 0
            || request.PresentationTexts?.Count > 0
            || request.ProcessState?.State is not null
            || request.ProcessState?.Events?.Count > 0
        )
        {
            return BadRequest(
                "deleteInstance cannot be combined with other aggregate mutation operations."
            );
        }

        return null;
    }

    private ActionResult ValidateDuplicateDataElementMutationIds(
        InstanceMutationRequest mutationRequest
    )
    {
        IEnumerable<Guid> dataElementIds = (
            mutationRequest.UpdateDataElements?.Select(update => update.DataElementId)
            ?? Enumerable.Empty<Guid>()
        ).Concat(
            mutationRequest.DeleteDataElements?.Select(delete => delete.DataElementId)
                ?? Enumerable.Empty<Guid>()
        );

        if (TryFindDuplicateDataElementId(dataElementIds, out Guid duplicateDataElementId))
        {
            return BadRequest(
                $"dataElementId '{duplicateDataElementId}' is referenced by more than one data element mutation operation."
            );
        }

        return null;
    }

    private static bool TryFindDuplicateDataElementId(
        IEnumerable<Guid> dataElementIds,
        out Guid duplicateDataElementId
    )
    {
        HashSet<Guid> seen = [];
        foreach (Guid dataElementId in dataElementIds ?? [])
        {
            if (dataElementId == Guid.Empty)
            {
                continue;
            }

            if (!seen.Add(dataElementId))
            {
                duplicateDataElementId = dataElementId;
                return true;
            }
        }

        duplicateDataElementId = Guid.Empty;
        return false;
    }

    private async Task<ActionResult> AuthorizeDeleteInstanceMutation(
        InstanceMutationRequest request
    )
    {
        if (request.DeleteInstance is null)
        {
            return null;
        }

        AuthorizationResult authorizationResult = await _policyAuthorizationService.AuthorizeAsync(
            User,
            resource: null,
            policyName: AuthzConstants.POLICY_INSTANCE_DELETE
        );

        return authorizationResult.Succeeded ? null : Forbid();
    }

    private static InstanceStatus BuildHardDeleteStatus(InstanceStatus currentStatus, DateTime now)
    {
        InstanceStatus status = currentStatus ?? new InstanceStatus();
        status.IsHardDeleted = true;
        status.IsSoftDeleted = true;
        status.HardDeleted = now;
        status.SoftDeleted ??= now;
        return status;
    }

    private (string IdempotencyKey, ActionResult Error) TryReadMutationIdempotencyKey(
        VersionPreconditions preconditions
    )
    {
        if (!Request.Headers.TryGetValue(StorageHeaders.IdempotencyKey, out StringValues values))
        {
            return (null, null);
        }

        if (values.Count != 1 || string.IsNullOrWhiteSpace(values[0]))
        {
            return (
                null,
                BadRequest($"{StorageHeaders.IdempotencyKey} must contain one non-empty value.")
            );
        }

        string idempotencyKey = values[0];
        if (idempotencyKey.Length > 200)
        {
            return (
                null,
                BadRequest($"{StorageHeaders.IdempotencyKey} must be at most 200 characters.")
            );
        }

        if (!Guid.TryParse(idempotencyKey, out Guid parsedIdempotencyKey))
        {
            return (null, BadRequest($"{StorageHeaders.IdempotencyKey} must be a GUID."));
        }

        if (preconditions.InstanceVersion is null)
        {
            return (
                null,
                BadRequest(
                    $"{StorageHeaders.IdempotencyKey} requires {StorageHeaders.IfInstanceVersionMatch}."
                )
            );
        }

        return (parsedIdempotencyKey.ToString(), null);
    }

    private async Task<(
        string BlobVersionId,
        string BlobStoragePath,
        long Size,
        DateTimeOffset BlobTimestamp,
        ActionResult Error
    )> StageBlob(
        Instance instance,
        Application application,
        Guid instanceGuid,
        Guid dataElementId,
        MutationContentPart contentPart,
        List<StagedBlob> stagedBlobs,
        CancellationToken cancellationToken
    )
    {
        if (contentPart.Length == 0)
        {
            return (null, null, 0, default, UnprocessableEntity("Could not process attached file"));
        }

        string blobVersionId = await _dataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
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

        try
        {
            await using Stream stream = contentPart.OpenReadStream();
            (long blobSize, DateTimeOffset blobTimestamp) = await _blobRepository.WriteBlob(
                instance.Org,
                stream,
                versionedBlobStoragePath,
                application.StorageAccountNumber
            );

            if (blobSize == 0)
            {
                await DeleteAllocatedBlobVersion(
                    instance.Org,
                    instanceGuid,
                    dataElementId,
                    versionedBlobStoragePath,
                    blobVersionId,
                    application.StorageAccountNumber
                );
                return (
                    null,
                    null,
                    0,
                    default,
                    UnprocessableEntity("Could not process attached file")
                );
            }

            stagedBlobs.Add(
                new StagedBlob(
                    instance.Org,
                    instanceGuid,
                    dataElementId,
                    blobVersionId,
                    versionedBlobStoragePath,
                    application.StorageAccountNumber
                )
            );
            return (blobVersionId, versionedBlobStoragePath, blobSize, blobTimestamp, null);
        }
        catch
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                dataElementId,
                versionedBlobStoragePath,
                blobVersionId,
                application.StorageAccountNumber
            );
            throw;
        }
    }

    private Task<(DataType DataType, ActionResult Error)> GetDataTypeAsync(
        Instance instance,
        string dataTypeId,
        Application application,
        CancellationToken cancellationToken
    )
    {
        DataType dataType = application.DataTypes.FirstOrDefault(e => e.Id == dataTypeId);

        (DataType DataType, ActionResult Error) result = dataType is null
            ? (
                null,
                NotFound(
                    $"Cannot find data type {dataTypeId} for application {instance.AppId} in storage"
                )
            )
            : (dataType, null);
        return Task.FromResult(result);
    }

    private static Dictionary<string, object> BuildMetadataPropertyList(
        InstanceMutationUpdateDataElement update
    )
    {
        Dictionary<string, object> propertyList = [];

        if (update.ContentType is not null)
        {
            propertyList["/contentType"] = update.ContentType;
        }

        if (update.Filename is not null)
        {
            propertyList["/filename"] = update.Filename;
        }

        if (update.Refs is not null)
        {
            propertyList["/refs"] = update.Refs;
        }

        if (update.GeneratedFromTask is not null)
        {
            propertyList["/references"] = CreateGeneratedFromTaskReferences(
                update.GeneratedFromTask
            );
        }

        if (update.Metadata is not null)
        {
            propertyList["/metadata"] = update.Metadata;
        }

        if (update.UserDefinedMetadata is not null)
        {
            propertyList["/userDefinedMetadata"] = update.UserDefinedMetadata;
        }

        if (update.Tags is not null)
        {
            propertyList["/tags"] = update.Tags;
        }

        if (update.DeleteStatus is not null)
        {
            propertyList["/deleteStatus"] = update.DeleteStatus;
        }

        if (update.Locked.HasValue)
        {
            propertyList["/locked"] = update.Locked.Value;
        }

        return propertyList;
    }

    private (string BlobVersionId, ActionResult Error) TryNormalizeExpectedCurrentBlobVersion(
        string expectedCurrentBlobVersion
    )
    {
        if (string.IsNullOrWhiteSpace(expectedCurrentBlobVersion))
        {
            return (null, null);
        }

        string blobVersionId = expectedCurrentBlobVersion.Trim();
        if (blobVersionId.StartsWith('"'))
        {
            if (
                !EntityTagHeaderValue.TryParseList(
                    new[] { blobVersionId },
                    out IList<EntityTagHeaderValue> ifMatch
                )
                || ifMatch.Count != 1
                || ifMatch[0].IsWeak
                || ifMatch[0].Equals(EntityTagHeaderValue.Any)
            )
            {
                return (
                    null,
                    BadRequest(
                        "expectedCurrentBlobVersion must be a blob version id or one strong ETag."
                    )
                );
            }

            if (!BlobVersionId.TryParseContentEtag(ifMatch[0].Tag.Value, out blobVersionId))
            {
                return (
                    null,
                    BadRequest("expectedCurrentBlobVersion must identify a blob version id.")
                );
            }
        }
        else
        {
            try
            {
                BlobVersionId.Decode(blobVersionId);
            }
            catch (Exception exception) when (exception is ArgumentException or FormatException)
            {
                return (
                    null,
                    BadRequest("expectedCurrentBlobVersion must identify a blob version id.")
                );
            }
        }

        return (blobVersionId, null);
    }

    private static DataElement CloneDataElementForScan(
        DataElement dataElement,
        Dictionary<string, object> propertyList,
        string blobStoragePath
    )
    {
        DataElement clone = JsonConvert.DeserializeObject<DataElement>(
            JsonConvert.SerializeObject(dataElement)
        );
        clone.BlobStoragePath = blobStoragePath;

        if (propertyList.TryGetValue("/contentType", out object contentType))
        {
            clone.ContentType = (string)contentType;
        }

        if (propertyList.TryGetValue("/filename", out object filename))
        {
            clone.Filename = (string)filename;
        }

        if (propertyList.TryGetValue("/size", out object size))
        {
            clone.Size = (long)size;
        }

        if (propertyList.TryGetValue("/fileScanResult", out object fileScanResult))
        {
            clone.FileScanResult = (FileScanResult)fileScanResult;
        }

        if (propertyList.TryGetValue("/lastChanged", out object lastChanged))
        {
            clone.LastChanged = (DateTime)lastChanged;
        }

        if (propertyList.TryGetValue("/lastChangedBy", out object lastChangedBy))
        {
            clone.LastChangedBy = (string)lastChangedBy;
        }

        return clone;
    }

    private async Task WriteVersionResponseHeaders(
        Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        VersionPreconditionHelper.WriteVersionResponseHeaders(
            Response,
            await _instanceRepository.ReadVersions(instanceGuid, cancellationToken)
        );
    }

    private void WriteVersionResponseHeaders(InstanceVersionResult versions)
    {
        VersionPreconditionHelper.WriteVersionResponseHeaders(Response, versions);
    }

    private static string FirstNonEmpty(string primary, string fallback) =>
        string.IsNullOrEmpty(primary) ? fallback : primary;

    private static List<Reference> CreateGeneratedFromTaskReferences(string generatedFromTask)
    {
        if (string.IsNullOrEmpty(generatedFromTask))
        {
            return null;
        }

        return
        [
            new Reference
            {
                Relation = RelationType.GeneratedFrom,
                Value = generatedFromTask,
                ValueType = ReferenceType.Task,
            },
        ];
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
            // Best-effort compensation must not hide the original metadata failure.
        }
    }

    private sealed record StagedBlob(
        string Org,
        Guid InstanceGuid,
        Guid DataElementId,
        string BlobVersionId,
        string BlobStoragePath,
        int? StorageAccountNumber
    );

    private sealed record FileScanCandidate(
        DataElement DataElement,
        DataType DataType,
        DateTimeOffset BlobTimestamp
    );

    private sealed record MutationContentPart(byte[] Bytes, string ContentType, string FileName)
    {
        public long Length => Bytes.LongLength;

        public Stream OpenReadStream() => new MemoryStream(Bytes);
    }
}
