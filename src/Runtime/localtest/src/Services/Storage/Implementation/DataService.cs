#nullable disable

using System;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;

namespace Altinn.Platform.Storage.Services
{
    /// <summary>
    /// Service class with business logic related to data blobs and their metadata documents.
    /// </summary>
    public class DataService : IDataService
    {
        private readonly IDataRepository _dataRepository;
        private readonly IBlobRepository _blobRepository;
        private readonly IInstanceEventService _instanceEventService;
        private readonly IInstanceMutationRepository _instanceMutationRepository;
        private readonly IInstanceRepository _instanceRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataService"/> class.
        /// </summary>
        public DataService(
            IDataRepository dataRepository,
            IBlobRepository blobRepository,
            IInstanceEventService instanceEventService,
            IInstanceMutationRepository instanceMutationRepository,
            IInstanceRepository instanceRepository)
        {
            _dataRepository = dataRepository;
            _blobRepository = blobRepository;
            _instanceEventService = instanceEventService;
            _instanceMutationRepository = instanceMutationRepository;
            _instanceRepository = instanceRepository;
        }

        /// <inheritdoc/>
        public Task StartFileScan(Instance instance, DataType dataType, DataElement dataElement, DateTimeOffset blobTimestamp, int? altinnMainVersion, CancellationToken ct)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc/>
        public async Task<(string FileHash, ServiceError ServiceError)> GenerateSha256Hash(string org, Guid instanceGuid, Guid dataElementId, int? altinnMainVersion)
        {
            DataElement dataElement = await _dataRepository.Read(instanceGuid, dataElementId);
            if (dataElement == null)
            {
                return (null, new ServiceError(404, $"DataElement not found, dataElementId: {dataElementId}"));
            }

            using Stream filestream = await _blobRepository.ReadBlob(org, dataElement.BlobStoragePath, altinnMainVersion);
            if (filestream == null || !filestream.CanRead)
            {
                return (null, new ServiceError(404, $"Failed reading file, dataElementId: {dataElementId}"));
            }

            return (CalculateSha256Hash(filestream), null);
        }

        /// <inheritdoc/>
        public async Task<DataUploadResult> UploadDataAndCreateDataElement(
            string org,
            Stream stream,
            DataElement dataElement,
            long streamLength,
            int? altinnMainVersion,
            int? expectedInstanceVersion = null,
            int? expectedProcessStateVersion = null)
        {
            Guid instanceGuid = Guid.Parse(dataElement.InstanceGuid);
            Guid dataElementId = Guid.Parse(dataElement.Id);
            string appId = GetAppId(dataElement);
            string blobVersionId = await _dataRepository.CreateBlobVersionId(
                instanceGuid,
                dataElementId,
                appId,
                org,
                altinnMainVersion
            );
            string versionedBlobStoragePath = BlobRepository.GetVersionedBlobPath(
                appId,
                dataElement.InstanceGuid,
                blobVersionId
            );
            dataElement.BlobStoragePath = versionedBlobStoragePath;

            long length;
            try
            {
                (length, _) = await _blobRepository.WriteBlob(org, stream, dataElement.BlobStoragePath, altinnMainVersion);
            }
            catch
            {
                await DeleteAllocatedBlobVersion(
                    org,
                    instanceGuid,
                    dataElementId,
                    versionedBlobStoragePath,
                    blobVersionId,
                    altinnMainVersion
                );
                throw;
            }

            dataElement.Size = length;

            DataElementWriteResult<DataElement> result;
            try
            {
                result = await _dataRepository.Create(
                    dataElement,
                    streamLength,
                    expectedInstanceVersion: expectedInstanceVersion,
                    expectedProcessStateVersion: expectedProcessStateVersion);
            }
            catch
            {
                await DeleteAllocatedBlobVersion(
                    org,
                    instanceGuid,
                    dataElementId,
                    versionedBlobStoragePath,
                    blobVersionId,
                    altinnMainVersion
                );
                throw;
            }

            return new DataUploadResult(
                result.DataElement,
                result.InstanceVersion,
                result.ProcessStateVersion
            );
        }

        /// <inheritdoc/>
        public async Task<DataElementWriteResult<DataElement>> DeleteImmediately(
            Instance instance,
            DataElement dataElement,
            int? altinnMainVersion,
            int? expectedInstanceVersion = null,
            int? expectedProcessStateVersion = null)
        {
            InstanceEvent deletedEvent = _instanceEventService.BuildInstanceEvent(
                InstanceEventType.Deleted,
                instance,
                dataElement
            );

            Guid instanceGuid = Guid.Parse(dataElement.InstanceGuid);
            InstanceMutationCommit mutation = new(
                [],
                [],
                [new InstanceMutationDataElementDelete(dataElement, true)],
                instance,
                [],
                expectedInstanceVersion,
                expectedProcessStateVersion,
                null,
                [deletedEvent]
            );

            await _instanceMutationRepository.Apply(
                instanceGuid,
                0,
                mutation
            );

            InstanceVersionResult versions = await _instanceRepository.ReadVersions(instanceGuid);
            await CleanupDeletedDataElementBlobs(instance, dataElement, altinnMainVersion);
            return new DataElementWriteResult<DataElement>(
                dataElement,
                versions.InstanceVersion,
                versions.ProcessStateVersion
            );
        }

        /// <inheritdoc/>
        public async Task CleanupDeletedDataElementBlobs(
            Instance instance,
            DataElement dataElement,
            int? storageAccountNumber,
            CancellationToken cancellationToken = default)
        {
            Guid instanceGuid = Guid.Parse(dataElement.InstanceGuid);
            Guid dataElementId = Guid.Parse(dataElement.Id);
            string appId = TryGetAppId(dataElement);
            IReadOnlyList<string> detachedBlobVersions =
                await _dataRepository.ReadDetachedBlobVersions(
                    instanceGuid,
                    dataElementId,
                    cancellationToken
                );

            if (detachedBlobVersions.Count == 0)
            {
                await DeleteLegacyDataElementBlob(instance, dataElement, storageAccountNumber);
                return;
            }

            foreach (string blobVersionId in detachedBlobVersions)
            {
                cancellationToken.ThrowIfCancellationRequested();
                string blobStoragePath = appId is null
                    ? dataElement.BlobStoragePath
                    : BlobRepository.GetVersionedBlobPath(appId, dataElement.InstanceGuid, blobVersionId);

                try
                {
                    await _blobRepository.DeleteBlob(instance.Org, blobStoragePath, storageAccountNumber);
                }
                catch
                {
                    continue;
                }

                try
                {
                    await _dataRepository.DeleteBlobVersion(
                        instanceGuid,
                        dataElementId,
                        blobVersionId,
                        cancellationToken
                    );
                }
                catch
                {
                    // Best-effort metadata cleanup after local metadata has already committed.
                }
            }
        }

        private async Task DeleteLegacyDataElementBlob(
            Instance instance,
            DataElement dataElement,
            int? storageAccountNumber)
        {
            if (string.IsNullOrEmpty(dataElement.BlobStoragePath))
            {
                return;
            }

            try
            {
                await _blobRepository.DeleteBlob(
                    instance.Org,
                    dataElement.BlobStoragePath,
                    storageAccountNumber
                );
            }
            catch
            {
                // Legacy local blobs have no durable blob-version metadata to retry from.
            }
        }

        private string CalculateSha256Hash(Stream fileStream)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                return BitConverter.ToString(sha256.ComputeHash(fileStream)).Replace("-", "").ToLowerInvariant();
            }
        }

        private static string GetAppId(DataElement dataElement)
        {
            string appId = TryGetAppId(dataElement);
            if (appId is null)
            {
                throw new InvalidDataException("Unable to resolve app id from data element blob path.");
            }

            return appId;
        }

        private static string TryGetAppId(DataElement dataElement)
        {
            string marker = $"/{dataElement.InstanceGuid}/data/";
            int markerIndex = dataElement.BlobStoragePath?.IndexOf(marker, StringComparison.Ordinal) ?? -1;
            if (markerIndex <= 0)
            {
                marker = $"/{dataElement.InstanceGuid}/data-elements/";
                markerIndex = dataElement.BlobStoragePath?.IndexOf(marker, StringComparison.Ordinal) ?? -1;
                if (markerIndex <= 0)
                {
                    return null;
                }
            }

            return dataElement.BlobStoragePath[..markerIndex];
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
    }
}
