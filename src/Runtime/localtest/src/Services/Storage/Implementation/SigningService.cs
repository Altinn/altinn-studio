#nullable disable

using System.Text.Json;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;

namespace Altinn.Platform.Storage.Services;

/// <summary>
/// Service class with business logic related to signing
/// </summary>
public class SigningService : ISigningService
{
    private readonly IInstanceRepository _instanceRepository;
    private readonly IApplicationRepository _applicationRepository;
    private readonly IBlobRepository _blobRepository;
    private readonly ILogger<SigningService> _logger;
    private readonly IDataService _dataService;
    private readonly IDataRepository _dataRepository;
    private readonly IApplicationService _applicationService;
    private readonly IInstanceEventService _instanceEventService;
    private readonly IInstanceMutationRepository _instanceMutationRepository;
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(
        JsonSerializerOptions.Web
    )
    {
        WriteIndented = true,
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="SigningService"/> class.
    /// </summary>
    public SigningService(
        IInstanceRepository instanceRepository,
        IDataService dataService,
        IDataRepository dataRepository,
        IApplicationService applicationService,
        IInstanceEventService instanceEventService,
        IInstanceMutationRepository instanceMutationRepository,
        IApplicationRepository applicationRepository,
        IBlobRepository blobRepository,
        ILogger<SigningService> logger
    )
    {
        _instanceRepository = instanceRepository;
        _dataService = dataService;
        _dataRepository = dataRepository;
        _applicationService = applicationService;
        _instanceEventService = instanceEventService;
        _instanceMutationRepository = instanceMutationRepository;
        _applicationRepository = applicationRepository;
        _blobRepository = blobRepository;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<SignDocumentCreateResult> CreateSignDocument(
        Guid instanceGuid,
        SignRequest signRequest,
        string performedBy,
        CancellationToken cancellationToken,
        int? expectedInstanceVersion = null,
        int? expectedProcessStateVersion = null
    )
    {
        (Instance instance, long instanceInternalId) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        if (instance == null)
        {
            return new SignDocumentCreateResult(false, new ServiceError(404, "Instance not found"));
        }

        await _instanceRepository.CheckVersions(
            instanceGuid,
            expectedInstanceVersion,
            expectedProcessStateVersion,
            cancellationToken);

        Application app = await _applicationRepository.FindOne(
            instance.AppId,
            instance.Org,
            cancellationToken
        );

        (bool validDataType, ServiceError serviceError) =
            await _applicationService.ValidateDataTypeForApp(
                instance.Org,
                instance.AppId,
                signRequest.SignatureDocumentDataType,
                instance.Process.CurrentTask?.ElementId
            );
        if (!validDataType)
        {
            return new SignDocumentCreateResult(false, serviceError);
        }

        SignDocument signDocument = CreateSignDocument(instanceGuid, signRequest);

        foreach (
            SignRequest.DataElementSignature dataElementSignature in signRequest.DataElementSignatures
        )
        {
            (string base64Sha256Hash, serviceError) = await _dataService.GenerateSha256Hash(
                instance.Org,
                instanceGuid,
                Guid.Parse(dataElementSignature.DataElementId),
                app.StorageAccountNumber
            );
            if (string.IsNullOrEmpty(base64Sha256Hash))
            {
                return new SignDocumentCreateResult(false, serviceError);
            }

            signDocument.DataElementSignatures.Add(
                new SignDocument.DataElementSignature
                {
                    DataElementId = dataElementSignature.DataElementId,
                    Sha256Hash = base64Sha256Hash,
                    Signed = dataElementSignature.Signed,
                }
            );
        }

        DataElement dataElement = DataElementHelper.CreateDataElement(
            signRequest.SignatureDocumentDataType,
            null,
            instance,
            signDocument.SignedTime,
            "application/json",
            $"{signRequest.SignatureDocumentDataType}.json",
            0,
            performedBy,
            signRequest.GeneratedFromTask
        );

        dataElement.Locked = true; // Lock the data element to prevent changes after signing
        signDocument.Id = dataElement.Id;

        SignDocDownloadResult existingSignDocument = await FindExistingSignDocumentForSignee(
            instance,
            app,
            signRequest.SignatureDocumentDataType,
            signDocument.SigneeInfo,
            cancellationToken
        );

        string stagedBlobVersionId;
        using (var fileStream = new MemoryStream())
        {
            await JsonSerializer.SerializeAsync(
                fileStream,
                signDocument,
                _jsonSerializerOptions,
                cancellationToken
            );

            fileStream.Position = 0;
            stagedBlobVersionId = await StageSignDocumentDataElementBlob(
                instance,
                fileStream,
                dataElement,
                app.StorageAccountNumber,
                cancellationToken
            );
        }

        try
        {
            List<InstanceEvent> instanceEvents =
            [
                _instanceEventService.BuildInstanceEvent(InstanceEventType.Signed, instance),
            ];
            if (existingSignDocument is not null)
            {
                instanceEvents.Add(
                    _instanceEventService.BuildInstanceEvent(
                        InstanceEventType.Deleted,
                        instance,
                        existingSignDocument.DataElement
                    )
                );
            }

            InstanceMutationCommit mutation = new(
                [dataElement],
                [],
                existingSignDocument is null
                    ? []
                    : [new InstanceMutationDataElementDelete(existingSignDocument.DataElement, false)],
                instance,
                [],
                expectedInstanceVersion,
                expectedProcessStateVersion,
                null,
                instanceEvents
            );

            await _instanceMutationRepository.Apply(
                instanceGuid,
                instanceInternalId,
                mutation,
                cancellationToken
            );
        }
        catch
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                Guid.Parse(dataElement.Id),
                dataElement.BlobStoragePath,
                stagedBlobVersionId,
                app.StorageAccountNumber
            );
            throw;
        }

        InstanceVersionResult versions = await _instanceRepository.ReadVersions(
            instanceGuid,
            cancellationToken
        );
        (Instance updatedInstance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        if (existingSignDocument is not null)
        {
            await _dataService.CleanupDeletedDataElementBlobs(
                updatedInstance,
                existingSignDocument.DataElement,
                app.StorageAccountNumber,
                CancellationToken.None
            );
        }

        return new SignDocumentCreateResult(
            true,
            null,
            versions.InstanceVersion,
            versions.ProcessStateVersion
        );
    }

    private async Task<SignDocDownloadResult> FindExistingSignDocumentForSignee(
        Instance instance,
        Application application,
        string signDocDataType,
        Signee signee,
        CancellationToken cancellationToken
    )
    {
        List<DataElement> signingDocDataElements =
            instance.Data?.Where(x => x.DataType == signDocDataType).ToList() ?? [];

        List<Task<SignDocDownloadResult>> downloadAndDeserializeSignDocumentTasks =
            signingDocDataElements
                .Select(async dataElement =>
                {
                    try
                    {
                        await using Stream stream = await _blobRepository.ReadBlob(
                            instance.Org,
                            dataElement.BlobStoragePath,
                            application.StorageAccountNumber,
                            cancellationToken
                        );
                        var signDocument = await JsonSerializer.DeserializeAsync<SignDocument>(
                            stream,
                            cancellationToken: cancellationToken
                        );
                        return new SignDocDownloadResult
                        {
                            DataElement = dataElement,
                            SignDocument = signDocument,
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(
                            ex,
                            "Error reading or deserializing blob for DataElement {DataElementId} while checking for existing signature.",
                            dataElement.Id
                        );
                        return null;
                    }
                })
                .ToList();

        SignDocDownloadResult[] results = await Task.WhenAll(
            downloadAndDeserializeSignDocumentTasks
        );

        foreach (SignDocDownloadResult result in results)
        {
            if (result is null || !SigneesAreEqual(result.SignDocument.SigneeInfo, signee))
            {
                continue;
            }

            _logger.LogInformation(
                "Sign document already exists for this signee. Replacing existing sign document. Data element id: {DataElementId}",
                result.DataElement.Id
            );

            return result;
        }

        return null;
    }

    private async Task<string> StageSignDocumentDataElementBlob(
        Instance instance,
        Stream stream,
        DataElement dataElement,
        int? storageAccountNumber,
        CancellationToken cancellationToken
    )
    {
        Guid instanceGuid = Guid.Parse(dataElement.InstanceGuid);
        Guid dataElementId = Guid.Parse(dataElement.Id);
        string blobVersionId = await _dataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber,
            cancellationToken
        );
        string blobStoragePath = BlobRepository.GetVersionedBlobPath(
            instance.AppId,
            dataElement.InstanceGuid,
            blobVersionId
        );
        dataElement.BlobStoragePath = blobStoragePath;

        try
        {
            (long length, _) = await _blobRepository.WriteBlob(
                instance.Org,
                stream,
                blobStoragePath,
                storageAccountNumber
            );
            dataElement.Size = length;
        }
        catch
        {
            await DeleteAllocatedBlobVersion(
                instance.Org,
                instanceGuid,
                dataElementId,
                blobStoragePath,
                blobVersionId,
                storageAccountNumber
            );
            throw;
        }

        return blobVersionId;
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
            // Best-effort compensation must not hide the original signing failure.
        }
    }

    private static SignDocument CreateSignDocument(Guid instanceGuid, SignRequest signRequest)
    {
        var signDocument = new SignDocument
        {
            InstanceGuid = instanceGuid.ToString(),
            SignedTime = DateTime.UtcNow,
            SigneeInfo = new Signee
            {
                UserId = signRequest.Signee.UserId,
                PersonNumber = signRequest.Signee.PersonNumber,
                OrganisationNumber = signRequest.Signee.OrganisationNumber,
                SystemUserId = signRequest.Signee.SystemUserId,
            },
        };

        return signDocument;
    }

    private static bool SigneesAreEqual(Signee signee1, Signee signee2) =>
        signee1 is not null
        && signee2 is not null
        && signee1.UserId == signee2.UserId
        && signee1.SystemUserId == signee2.SystemUserId
        && signee1.PersonNumber == signee2.PersonNumber
        && signee1.OrganisationNumber == signee2.OrganisationNumber;
}

#pragma warning disable SA1600 // Elements should be documented
sealed record SignDocDownloadResult
{
    public DataElement DataElement { get; init; }

    public SignDocument SignDocument { get; init; }
}
#pragma warning restore SA1600
