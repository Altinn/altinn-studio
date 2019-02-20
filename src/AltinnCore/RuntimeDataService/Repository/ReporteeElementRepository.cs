using System;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Runtime.DataService.Configuration;
using AltinnCore.Runtime.DataService.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Runtime.DataService.Repository
{
    public class ReporteeElementRepository : IReporteeElementRepository
    {
        private readonly Uri _databaseUri;
        private readonly Uri _collectionUri;
        private readonly string databaseId;
        private readonly string collectionId;
        private static DocumentClient _client;
        private readonly AzureCosmosSettings _cosmosettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="ReporteeElementRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public ReporteeElementRepository(IOptions<AzureCosmosSettings> cosmosettings)
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
        /// To insert new reportee element into reportee element collection
        /// </summary>
        /// <param name="item">the form data</param>
        /// <returns>The deserialized formdata saved to file</returns>
        public async Task<string> InsertReporteeElementIntoCollectionAsync(ReporteeElement item)
        {
            try
            {
                var document = await _client.CreateDocumentAsync(_collectionUri, item);
                var res = document.Resource;
                var formData = JsonConvert.DeserializeObject<ReporteeElement>(res.ToString());

                return formData.Id;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }

        /// <summary>
        /// Get the reportee element based on the input parameters
        /// </summary>
        /// <param name="reporteeId">the id of the reportee</param>
        /// <param name="reporteeElementId">the id of the reporteeelement</param>
        /// <returns>the reportee element for the given parameters</returns>
        public async Task<ReporteeElement> GetReporteeElementFromCollectionAsync(string reporteeId, string reporteeElementId)
        {
            try
            {
                string sqlQuery = $"SELECT * FROM REPORTEEELEMENT WHERE REPORTEEELEMENT.id = '{reporteeElementId}'";

                //IDocumentQuery<dynamic> query = _client.CreateDocumentQuery(_collectionUri, sqlQuery, new FeedOptions { PartitionKey = new PartitionKey(reporteeId) }).AsDocumentQuery();
                IDocumentQuery<dynamic> query = _client.CreateDocumentQuery(_collectionUri, sqlQuery, new FeedOptions { EnableCrossPartitionQuery = true}).AsDocumentQuery();
                ReporteeElement reporteeElement = null;
                while (query.HasMoreResults)
                {
                    FeedResponse<ReporteeElement> res = await query.ExecuteNextAsync<ReporteeElement>();
                    if (res.Count != 0)
                    {
                        reporteeElement = res.First();
                        break;
                    }
                }

                return reporteeElement;
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
        /// Update reportee element for a given form id
        /// </summary>
        /// <param name="id">the id of the form to be updated</param>
        /// <param name="item">the form data to be updated</param>
        /// <returns>The reportee element</returns>
        public async Task<ReporteeElement> UpdateFormDataInCollectionAsync(string id, ReporteeElement item)
        {
            try
            {
                var document = await _client.ReplaceDocumentAsync(UriFactory.CreateDocumentUri(databaseId, collectionId, id), item);
                var data = document.Resource.ToString();
                var reporteeElement = JsonConvert.DeserializeObject<ReporteeElement>(data);
                return reporteeElement;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }
    }
}
