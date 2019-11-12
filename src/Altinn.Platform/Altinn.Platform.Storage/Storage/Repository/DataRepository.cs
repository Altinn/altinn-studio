using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Configuration;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;

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
        private readonly string collectionId = "dataElements";
        private readonly string partitionKey = "/instanceGuid";
        private static DocumentClient _client;
        private readonly AzureStorageConfiguration _storageConfiguration;
        private CloudBlobClient blobClient;
        private CloudBlobContainer container;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for azure cosmos database</param>
        /// <param name="storageConfiguration">the storage configuration for azure blob storage</param>
        public DataRepository(IOptions<AzureCosmosSettings> cosmosettings, IOptions<AzureStorageConfiguration> storageConfiguration)
        {
            var database = new CosmosDatabaseHandler(cosmosettings.Value);

            _client = database.CreateDatabaseAndCollection(collectionId);
            _collectionUri = database.CollectionUri;
            Uri databaseUri = database.DatabaseUri;
            databaseId = database.DatabaseName;

            DocumentCollection documentCollection = database.CreateDocumentCollection(collectionId, partitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _client.OpenAsync();
         
            _storageConfiguration = storageConfiguration.Value;

            // connect to azure blob storage
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            blobClient = CreateBlobClient(storageCredentials, storageAccount);
            container = blobClient.GetContainerReference(_storageConfiguration.StorageContainer);
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
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);

            await blockBlob.UploadFromStreamAsync(fileStream);
            blockBlob.FetchAttributes();
            
            return await Task.FromResult(blockBlob.Properties.Length);
        }

        /// <inheritdoc/>
        public async Task<Stream> ReadDataFromStorage(string fileName)
        {
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);

            var memoryStream = new MemoryStream();
            await blockBlob.DownloadToStreamAsync(memoryStream);
            memoryStream.Position = 0;
            return memoryStream;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteDataInStorage(string fileName)
        {           
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);

            bool result = await blockBlob.DeleteIfExistsAsync();

            return result;
        }
    }
}
