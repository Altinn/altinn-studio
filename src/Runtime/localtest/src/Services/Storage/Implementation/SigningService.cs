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
    private readonly IApplicationService _applicationService;
    private readonly IInstanceEventService _instanceEventService;
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
        IApplicationService applicationService,
        IInstanceEventService instanceEventService,
        IApplicationRepository applicationRepository,
        IBlobRepository blobRepository,
        ILogger<SigningService> logger
    )
    {
        _instanceRepository = instanceRepository;
        _dataService = dataService;
        _applicationService = applicationService;
        _instanceEventService = instanceEventService;
        _applicationRepository = applicationRepository;
        _blobRepository = blobRepository;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<(bool Created, ServiceError ServiceError)> CreateSignDocument(
        Guid instanceGuid,
        SignRequest signRequest,
        string performedBy,
        CancellationToken cancellationToken
    )
    {
        (Instance instance, long instanceInternalId) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        if (instance == null)
        {
            return (false, new ServiceError(404, "Instance not found"));
        }

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
            return (false, serviceError);
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
                return (false, serviceError);
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

        signDocument.Id = dataElement.Id;

        await DeleteExistingSignDocumentForSignee(
            instance,
            signRequest.SignatureDocumentDataType,
            signDocument.SigneeInfo,
            cancellationToken
        );

        using (var fileStream = new MemoryStream())
        {
            await JsonSerializer.SerializeAsync(
                fileStream,
                signDocument,
                _jsonSerializerOptions,
                cancellationToken
            );

            fileStream.Position = 0;
            await _dataService.UploadDataAndCreateDataElement(
                instance.Org,
                fileStream,
                dataElement,
                instanceInternalId,
                app.StorageAccountNumber
            );
        }

        await _instanceEventService.DispatchEvent(InstanceEventType.Signed, instance);
        return (true, null);
    }

    private async Task DeleteExistingSignDocumentForSignee(
        Instance instance,
        string signDocDataType,
        Signee signee,
        CancellationToken cancellationToken
    )
    {
        Application application = await _applicationRepository.FindOne(
            instance.AppId,
            instance.Org,
            cancellationToken
        );
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
                "Sign document already exists for this signee. Deleting existing sign document. Data element id: {DataElementId}",
                result.DataElement.Id
            );

            await _dataService.DeleteImmediately(
                instance,
                result.DataElement,
                application.StorageAccountNumber
            );
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
file sealed record SignDocDownloadResult
{
    public DataElement DataElement { get; init; }

    public SignDocument SignDocument { get; init; }
}
#pragma warning restore SA1600
