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

        /// <summary>
        /// Initializes a new instance of the <see cref="DataService"/> class.
        /// </summary>
        public DataService(IDataRepository dataRepository)
        {
            _dataRepository = dataRepository;
        }

        /// <inheritdoc/>
        public Task StartFileScan(Instance instance, DataType dataType, DataElement dataElement, DateTimeOffset blobTimestamp, CancellationToken ct)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc/>
        public async Task<(string FileHash, ServiceError ServiceError)> GenerateSha256Hash(string org, Guid instanceGuid, Guid dataElementId)
        {
            DataElement dataElement = await _dataRepository.Read(instanceGuid, dataElementId);
            if (dataElement == null)
            {
                return (null, new ServiceError(404, $"DataElement not found, dataElementId: {dataElementId}"));
            }

            Stream filestream = await _dataRepository.ReadDataFromStorage(org, dataElement.BlobStoragePath);
            if (filestream == null || !filestream.CanRead)
            {
                return (null, new ServiceError(404, $"Failed reading file, dataElementId: {dataElementId}"));
            }

            return (CalculateSha256Hash(filestream), null);
        }

        /// <inheritdoc/>
        public async Task UploadDataAndCreateDataElement(string org, Stream stream, DataElement dataElement)
        {
            (long length, DateTimeOffset blobTimestamp) = await _dataRepository.WriteDataToStorage(org, stream, dataElement.BlobStoragePath);
            dataElement.Size = length;

            await _dataRepository.Create(dataElement);
        }

        private string CalculateSha256Hash(Stream fileStream)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] hashBytes = sha256.ComputeHash(fileStream);
                return Convert.ToBase64String(hashBytes);
            }
        }
    }
}
