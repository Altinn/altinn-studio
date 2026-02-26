using System;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Clients;
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

        /// <summary>
        /// Initializes a new instance of the <see cref="DataService"/> class.
        /// </summary>
        public DataService(IDataRepository dataRepository, IBlobRepository blobRepository)
        {
            _dataRepository = dataRepository;
            _blobRepository = blobRepository;
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
        public async Task UploadDataAndCreateDataElement(string org, Stream stream, DataElement dataElement, long streamLength, int? altinnMainVersion)
        {
            (long length, DateTimeOffset blobTimestamp) = await _blobRepository.WriteBlob(org, stream, dataElement.BlobStoragePath, altinnMainVersion);
            dataElement.Size = length;

            await _dataRepository.Create(dataElement, streamLength);
        }

        /// <inheritdoc/>
        public async Task<DataElement> DeleteImmediately(Instance instance, DataElement dataElement, int? altinnMainVersion)
        {
            await _blobRepository.DeleteBlob(instance.Org, dataElement.BlobStoragePath, altinnMainVersion);
            await _dataRepository.Delete(dataElement);
            return dataElement;
        }

        private string CalculateSha256Hash(Stream fileStream)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                return BitConverter.ToString(sha256.ComputeHash(fileStream)).Replace("-", "").ToLowerInvariant();
            }
        }
    }
}
