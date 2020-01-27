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
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// repository for form data
    /// </summary>
    public class DataRepository : IDataRepository
    {
        private readonly Uri _collectionUri;
        private readonly string _databaseId;
        private readonly string _collectionId = "dataElements";
        private readonly string _partitionKey = "/instanceGuid";
        private static DocumentClient _client;
        private readonly AzureStorageConfiguration _storageConfiguration;
        private readonly CloudBlobClient _blobClient;
        private readonly CloudBlobContainer _container;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for azure cosmos database</param>
        /// <param name="storageConfiguration">the storage configuration for azure blob storage</param>
        public DataRepository(IOptions<AzureCosmosSettings> cosmosettings, IOptions<AzureStorageConfiguration> storageConfiguration)
        {
            var database = new CosmosDatabaseHandler(cosmosettings.Value);

            _client = database.CreateDatabaseAndCollection(_collectionId);
            _collectionUri = database.CollectionUri;
            Uri databaseUri = database.DatabaseUri;
            _databaseId = database.DatabaseName;

            DocumentCollection documentCollection = database.CreateDocumentCollection(_collectionId, _partitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _client.OpenAsync();
         
            _storageConfiguration = storageConfiguration.Value;

            // connect to azure blob storage
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            _blobClient = CreateBlobClient(storageCredentials, storageAccount);
            _container = _blobClient.GetContainerReference(_storageConfiguration.StorageContainer);
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

        /// <inheritdoc/>
        public async Task<long> WriteDataToStorage(Stream fileStream, string fileName)
        {
            CloudBlockBlob blockBlob = _container.GetBlockBlobReference(fileName);

            await blockBlob.UploadFromStreamAsync(fileStream);
            blockBlob.FetchAttributes();
            
            return await Task.FromResult(blockBlob.Properties.Length);
        }

        /// <inheritdoc/>
        public async Task<Stream> ReadDataFromStorage(string fileName)
        {
            CloudBlockBlob blockBlob = _container.GetBlockBlobReference(fileName);

            var memoryStream = new MemoryStream();
            await blockBlob.DownloadToStreamAsync(memoryStream);
            memoryStream.Position = 0;
            return memoryStream;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteDataInStorage(string fileName)
        {           
            CloudBlockBlob blockBlob = _container.GetBlockBlobReference(fileName);

            bool result = await blockBlob.DeleteIfExistsAsync();

            return result;
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

            IQueryable<DataElement> filter = _client
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
            ResourceResponse<Document> createDocumentResponse = await _client.CreateDocumentAsync(_collectionUri, dataElement);
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

            DataElement dataElement = await _client
                .ReadDocumentAsync<DataElement>(
                    uri,
                    new RequestOptions { PartitionKey = new PartitionKey(instanceKey) });

            return dataElement;
        }

        /// <inheritdoc/>
        public async Task<DataElement> Update(DataElement dataElement)
        {
            ResourceResponse<Document> createDocumentResponse = await _client
              .ReplaceDocumentAsync(UriFactory.CreateDocumentUri(_databaseId, _collectionId, dataElement.Id), dataElement);
            Document document = createDocumentResponse.Resource;
            DataElement updatedElement = JsonConvert.DeserializeObject<DataElement>(document.ToString());

            return updatedElement;
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(DataElement dataElement)
        {
            Uri uri = UriFactory.CreateDocumentUri(_databaseId, _collectionId, dataElement.Id);

            await _client.DeleteDocumentAsync(
                uri.ToString(),
                new RequestOptions { PartitionKey = new PartitionKey(dataElement.InstanceGuid) });

            return true;
        }
    }
}
