using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Models;
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
        private readonly Uri _databaseUri;
        private readonly Uri _collectionUri;
        private readonly string databaseId;
        private readonly string collectionId;
        private static DocumentClient _client;
        private readonly AzureCosmosSettings _cosmosettings;
        private readonly AzureStorageConfiguration _storageConfiguration;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        /// <param name="storageConfiguration">the storage configuration</param>
        public DataRepository(IOptions<AzureCosmosSettings> cosmosettings, IOptions<AzureStorageConfiguration> storageConfiguration)
        {
            // Retrieve configuration values from appsettings.json
            _cosmosettings = cosmosettings.Value;
            _client = new DocumentClient(new Uri(_cosmosettings.EndpointUri), _cosmosettings.PrimaryKey);
            _databaseUri = UriFactory.CreateDatabaseUri(_cosmosettings.Database);
            _collectionUri = UriFactory.CreateDocumentCollectionUri(_cosmosettings.Database, _cosmosettings.Collection);
            databaseId = _cosmosettings.Database;
            collectionId = _cosmosettings.Collection;
            _client.CreateDatabaseIfNotExistsAsync(new Database { Id = _cosmosettings.Database }).GetAwaiter().GetResult();
            _client.CreateDocumentCollectionIfNotExistsAsync(
                _databaseUri,
                new DocumentCollection { Id = _cosmosettings.Collection }).GetAwaiter().GetResult();
            _storageConfiguration = storageConfiguration.Value;
        }

        public async Task<bool> CreateDataInStorage(Stream fileStream, string fileName)
        {
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);
            CloudBlobClient blobClient = CreateBlobClient(storageCredentials, storageAccount);

            CloudBlobContainer container = blobClient.GetContainerReference(_storageConfiguration.StorageContainer);
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);

            await blockBlob.UploadFromStreamAsync(fileStream);
            return await Task.FromResult(true);
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

        public async Task<bool> UpdateDataInStorage(Stream fileStream, string fileName)
        {
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            CloudBlobClient blobClient = CreateBlobClient(storageCredentials, storageAccount);

            CloudBlobContainer container = blobClient.GetContainerReference(_storageConfiguration.StorageContainer);
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);

            await blockBlob.UploadFromStreamAsync(fileStream);
            return await Task.FromResult(true);
        }

        public async Task<Stream> GetDataInStorage(string fileName)
        {
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);
            
            CloudBlobClient blobClient = CreateBlobClient(storageCredentials, storageAccount);
           
            CloudBlobContainer container = blobClient.GetContainerReference(_storageConfiguration.StorageContainer);
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);

            var memoryStream = new MemoryStream();
            await blockBlob.DownloadToStreamAsync(memoryStream);
            memoryStream.Position = 0;
            return memoryStream;
        }

        public async Task<bool> DeleteDataInStorage(string fileName)
        {
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            CloudBlobClient blobClient = CreateBlobClient(storageCredentials, storageAccount);

            CloudBlobContainer container = blobClient.GetContainerReference(_storageConfiguration.StorageContainer);
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);

            bool result = await blockBlob.DeleteIfExistsAsync();

            return result;
        }
    }
}
