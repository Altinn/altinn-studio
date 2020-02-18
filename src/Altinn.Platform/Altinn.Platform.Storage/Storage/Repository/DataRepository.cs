using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Represents an implementation of <see cref="IDataRepository"/> using Azure CosmosDB to keep metadata
    /// and Azure Blob storage to keep the actual data. Blob storage is again split based on application owner.
    /// </summary>
    public class DataRepository : IDataRepository
    {
        private readonly Uri _collectionUri;
        private readonly string _databaseId;
        private readonly string _collectionId = "dataElements";
        private readonly string _partitionKey = "/instanceGuid";

        private readonly DocumentClient _documentClient;

        private readonly AzureStorageConfiguration _storageConfiguration;
        private readonly ISasTokenProvider _sasTokenProvider;
        private readonly ILogger<DataRepository> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataRepository"/> class
        /// </summary>
        /// <param name="sasTokenProvider">A provider that can be asked for SAS tokens.</param>
        /// <param name="cosmosettings">the configuration settings for azure cosmos database</param>
        /// <param name="storageConfiguration">the storage configuration for azure blob storage</param>
        /// <param name="logger">The logger to use when writing to logs.</param>
        public DataRepository(
            ISasTokenProvider sasTokenProvider,
            IOptions<AzureCosmosSettings> cosmosettings,
            IOptions<AzureStorageConfiguration> storageConfiguration,
            ILogger<DataRepository> logger)
        {
            _storageConfiguration = storageConfiguration.Value;
            _sasTokenProvider = sasTokenProvider;
            _logger = logger;

            CosmosDatabaseHandler database = new CosmosDatabaseHandler(cosmosettings.Value);

            _documentClient = database.CreateDatabaseAndCollection(_collectionId);
            _collectionUri = database.CollectionUri;
            Uri databaseUri = database.DatabaseUri;
            _databaseId = database.DatabaseName;

            DocumentCollection documentCollection = database.CreateDocumentCollection(_collectionId, _partitionKey);

            _documentClient.CreateDocumentCollectionIfNotExistsAsync(
                databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _documentClient.OpenAsync();
        }

        /// <inheritdoc/>
        public async Task<long> WriteDataToStorage(string org, Stream stream, string blobStoragePath)
        {
            try
            {
                return await UploadFromStreamAsync(org, stream, blobStoragePath);
            }
            catch (StorageException storageException)
            {
                _logger.LogWarning($"StorageException when accessing blob storage for {org}: {Environment.NewLine}{storageException}");
                _logger.LogWarning("Invalidating SAS token and retrying upload operation.");

                _sasTokenProvider.InvalidateSasToken(org);
                
                return await UploadFromStreamAsync(org, stream, blobStoragePath);
            }
        }

        /// <inheritdoc/>
        public async Task<Stream> ReadDataFromStorage(string org, string blobStoragePath)
        {
            try
            {
                return await DownloadToStreamAsync(org, blobStoragePath);
            }
            catch (StorageException storageException)
            {
                _logger.LogWarning($"StorageException when accessing blob storage for {org}: {Environment.NewLine}{storageException}");
                _logger.LogWarning("Invalidating SAS token and retrying download operation.");

                _sasTokenProvider.InvalidateSasToken(org);
                
                return await DownloadToStreamAsync(org, blobStoragePath);
            }
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteDataInStorage(string org, string blobStoragePath)
        {
            try
            {
                return await DeleteIfExistsAsync(org, blobStoragePath);
            }
            catch (StorageException storageException)
            {
                _logger.LogWarning($"StorageException when accessing blob storage for {org}: {Environment.NewLine}{storageException}");
                _logger.LogWarning("Invalidating SAS token and retrying delete operation.");

                _sasTokenProvider.InvalidateSasToken(org);
                
                return await DeleteIfExistsAsync(org, blobStoragePath);
            }
        }

        /// <inheritdoc/>
        public async Task<List<DataElement>> ReadAll(Guid instanceGuid)
        {
            string instanceKey = instanceGuid.ToString();

            FeedOptions feedOptions = new FeedOptions
            {
                PartitionKey = new PartitionKey(instanceKey),
                MaxItemCount = 10000,
            };

            IQueryable<DataElement> filter = _documentClient
                .CreateDocumentQuery<DataElement>(_collectionUri, feedOptions)
                .Where(d => d.InstanceGuid == instanceKey);

            IDocumentQuery<DataElement> query = filter.AsDocumentQuery();

            FeedResponse<DataElement> feedResponse = await query.ExecuteNextAsync<DataElement>();

            List<DataElement> instances = feedResponse.ToList();

            return instances;            
        }

        /// <inheritdoc/>
        public async Task<DataElement> Create(DataElement dataElement)
        {
            ResourceResponse<Document> createDocumentResponse = await _documentClient.CreateDocumentAsync(_collectionUri, dataElement);
            Document document = createDocumentResponse.Resource;
            DataElement dataElementStored = JsonConvert.DeserializeObject<DataElement>(document.ToString());

            return dataElementStored;
        }

        /// <inheritdoc/>
        public async Task<DataElement> Read(Guid instanceGuid, Guid dataElementGuid)
        {
            string instanceKey = instanceGuid.ToString();
            string dataElementKey = dataElementGuid.ToString();

            Uri uri = UriFactory.CreateDocumentUri(_databaseId, _collectionId, dataElementKey);

            DataElement dataElement = await _documentClient
                .ReadDocumentAsync<DataElement>(
                    uri,
                    new RequestOptions { PartitionKey = new PartitionKey(instanceKey) });

            return dataElement;
        }

        /// <inheritdoc/>
        public async Task<DataElement> Update(DataElement dataElement)
        {
            ResourceResponse<Document> createDocumentResponse = await _documentClient
              .ReplaceDocumentAsync(UriFactory.CreateDocumentUri(_databaseId, _collectionId, dataElement.Id), dataElement);
            Document document = createDocumentResponse.Resource;
            DataElement updatedElement = JsonConvert.DeserializeObject<DataElement>(document.ToString());

            return updatedElement;
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(DataElement dataElement)
        {
            Uri uri = UriFactory.CreateDocumentUri(_databaseId, _collectionId, dataElement.Id);

            await _documentClient.DeleteDocumentAsync(
                uri.ToString(),
                new RequestOptions { PartitionKey = new PartitionKey(dataElement.InstanceGuid) });

            return true;
        }

        private async Task<long> UploadFromStreamAsync(string org, Stream stream, string fileName)
        {
            CloudBlobContainer cloudBlobContainer = await GetBlobContainer(org);
            CloudBlockBlob blockBlob = cloudBlobContainer.GetBlockBlobReference(fileName);

            await blockBlob.UploadFromStreamAsync(stream);
            blockBlob.FetchAttributes();

            return blockBlob.Properties.Length;
        }

        private async Task<Stream> DownloadToStreamAsync(string org, string fileName)
        {
            CloudBlobContainer cloudBlobContainer = await GetBlobContainer(org);
            CloudBlockBlob blockBlob = cloudBlobContainer.GetBlockBlobReference(fileName);

            var memoryStream = new MemoryStream();
            await blockBlob.DownloadToStreamAsync(memoryStream);
            memoryStream.Position = 0;

            return memoryStream;
        }

        private async Task<bool> DeleteIfExistsAsync(string org, string fileName)
        {
            CloudBlobContainer cloudBlobContainer = await GetBlobContainer(org);
            CloudBlockBlob blockBlob = cloudBlobContainer.GetBlockBlobReference(fileName);

            bool result = await blockBlob.DeleteIfExistsAsync();

            return result;
        }

        private async Task<CloudBlobContainer> GetBlobContainer(string org)
        {
            if (_storageConfiguration.OrgPrivateBlobStorageEnabled)
            {
                string sasToken = await _sasTokenProvider.GetSasToken(org);
                StorageCredentials accountSasCredential = new StorageCredentials(sasToken);

                string accountName = string.Format(_storageConfiguration.OrgStorageAccount, org);
                string blobEndpoint = string.Format(_storageConfiguration.BlobEndPoint, accountName);
                string containerName = string.Format(_storageConfiguration.OrgStorageContainer, org);

                CloudStorageAccount accountWithSas = new CloudStorageAccount(accountSasCredential, new Uri(blobEndpoint), null, null, null);
                CloudBlobClient cloudBlobClient = accountWithSas.CreateCloudBlobClient();
                CloudBlobContainer cloudBlobContainer = cloudBlobClient.GetContainerReference(containerName);

                return cloudBlobContainer;
            }
            
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            CloudBlobClient commonBlobClient = CreateBlobClient(storageCredentials, storageAccount);
            return commonBlobClient.GetContainerReference(_storageConfiguration.StorageContainer);
        }

        private CloudBlobClient CreateBlobClient(StorageCredentials storageCredentials, CloudStorageAccount storageAccount)
        {
            CloudBlobClient blobClient;
            if (_storageConfiguration.AccountName.StartsWith("devstoreaccount1"))
            {
                StorageUri storageUrl = new StorageUri(new Uri(_storageConfiguration.BlobEndPoint));
                blobClient = new CloudBlobClient(storageUrl, storageCredentials);
            }
            else
            {
                blobClient = storageAccount.CreateCloudBlobClient();
            }

            return blobClient;
        }
    }
}
