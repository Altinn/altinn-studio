using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Runtime.DataService.Configuration;
using AltinnCore.Runtime.DataService.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;
using Newtonsoft.Json;

namespace AltinnCore.Runtime.DataService.Repository
{
    /// <summary>
    /// repository for form data
    /// </summary>
    public class FormDataRepository : IFormDataRepository
    {
        private readonly Uri _databaseUri;
        private readonly Uri _collectionUri;
        private readonly string databaseId;
        private readonly string collectionId;
        private static DocumentClient _client;
        private readonly AzureCosmosSettings _cosmosettings;
        private readonly AzureStorageConfiguration _storageConfiguration;

        /// <summary>
        /// Initializes a new instance of the <see cref="FormDataRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public FormDataRepository(IOptions<AzureCosmosSettings> cosmosettings, IOptions<AzureStorageConfiguration> storageConfiguration)
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

        /// <summary>
        /// To insert new form data into formdata collection
        /// </summary>
        /// <param name="item">the form data</param>
        /// <returns>The deserialized formdata saved to file</returns>
        public async Task<FormData> InsertFormDataIntoCollectionAsync(FormData item)
        {
            try
            {
                var document = await _client.CreateDocumentAsync(_collectionUri, item);
                var res = document.Resource;
                var formData = JsonConvert.DeserializeObject<FormData>(res.ToString());
                return formData;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }

        /// <summary>
        /// Get the formdata based on the input parameters
        /// </summary>
        /// <param name="reporteeId">the id of the reportee</param>
        /// <param name="reporteeElementId">the id of the reporteeelement</param>
        /// <param name="formId">the id of the form</param>
        /// <returns>the form data for the given parameters</returns>
        public async Task<FormData> GetFormDataFromCollectionAsync(string reporteeId, string reporteeElementId, string formId)
        {
            try
            {
                string sqlQuery = $"SELECT * FROM FORMDATA WHERE FORMDATA.reporteeElementId = '{reporteeElementId}' and FORMDATA.formId = '{formId}'";
                IDocumentQuery<dynamic> query = _client.CreateDocumentQuery(_collectionUri, sqlQuery, new FeedOptions { PartitionKey = new PartitionKey(reporteeId) }).AsDocumentQuery();
                FormData formData = null;
                while (query.HasMoreResults)
                {
                    FeedResponse<FormData> res = await query.ExecuteNextAsync<FormData>();
                    if (res.Count != 0)
                    {
                        formData = res.First();
                        break;
                    }
                }

                return formData;
            }
            catch (DocumentClientException e)
            {
                if (e.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return null;
                }
                else
                {
                    throw;
                }
            }
        }

        /// <summary>
        /// Update form data for a given form id
        /// </summary>
        /// <param name="id">the id of the form to be updated</param>
        /// <param name="item">the form data to be updated</param>
        /// <returns>The formdata save to file</returns>
        public async Task<FormData> UpdateFormDataInCollectionAsync(string id, FormData item)
        {
            try
            {
                var document = await _client.ReplaceDocumentAsync(UriFactory.CreateDocumentUri(databaseId, collectionId, id), item);
                var data = document.Resource.ToString();
                var formData = JsonConvert.DeserializeObject<FormData>(data);
                return formData;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }

        public async Task<bool> CreateFormDataInStorage(Stream fileStream, string fileName)
        {
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            //StorageUri storageUrl = new StorageUri(new Uri(_storageConfiguration.BlobEndPoint));
            //CloudBlobClient blobClient = new CloudBlobClient(storageUrl, storageCredentials);
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();
            CloudBlobContainer container = blobClient.GetContainerReference(_storageConfiguration.StorageContainer);
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);
            await blockBlob.UploadFromStreamAsync(fileStream);
            return await Task.FromResult(true);
        }

        public async Task<bool> UpdateFormDataInStorage(Stream fileStream, string fileName)
        {
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();
            CloudBlobContainer container = blobClient.GetContainerReference(_storageConfiguration.StorageContainer);
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);
            await blockBlob.UploadFromStreamAsync(fileStream);
            return await Task.FromResult(true);
        }

        public async Task<FormData> GetFormDataInStorage(string fileName)
        {
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfiguration.AccountName, _storageConfiguration.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            //StorageUri storageUrl = new StorageUri(new Uri(_storageConfiguration.BlobEndPoint));
            //CloudBlobClient blobClient = new CloudBlobClient(storageUrl, storageCredentials);
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();
            CloudBlobContainer container = blobClient.GetContainerReference(_storageConfiguration.StorageContainer);
            CloudBlockBlob blockBlob = container.GetBlockBlobReference(fileName);

            var memoryStream = new MemoryStream();
            string text;
            await blockBlob.DownloadToStreamAsync(memoryStream);
            memoryStream.Position = 0;
            using (StreamReader sr = new StreamReader(memoryStream))
            {
                text = sr.ReadToEnd();
            }
                
            var resultData = JsonConvert.DeserializeObject<FormData>(text);
            return resultData;
        }
    }
}
