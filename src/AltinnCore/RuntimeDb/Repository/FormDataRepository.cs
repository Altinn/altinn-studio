using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Runtime.Db.Configuration;
using AltinnCore.Runtime.Db.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Runtime.Db.Repository
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

        /// <summary>
        /// Initializes a new instance of the <see cref="FormDataRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public FormDataRepository(IOptions<AzureCosmosSettings> cosmosettings)
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
    }
}
