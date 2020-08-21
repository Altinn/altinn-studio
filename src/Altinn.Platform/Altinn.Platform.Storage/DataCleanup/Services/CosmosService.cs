using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.DataCleanup.Services
{
    /// <summary>
    /// Class that handles all interaction with Cosmos DB.
    /// </summary>
    public class CosmosService : ICosmosService
    {
        private readonly string databaseId = "Storage";
        private readonly string instanceCollectionId = "instances";
        private readonly string dataElementsCollectionId = "dataElements";

        private readonly DocumentClient _client;
        private readonly ILogger<ICosmosService> _logger;

        private bool _clientConnectionEstablished = false;

        /// <summary>
        /// Initializes a new instance of the <see cref="CosmosService"/> class.
        /// </summary>
        /// <param name="logger">The logger</param>
        public CosmosService(ILogger<ICosmosService> logger)
        {
            _logger = logger;

            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            };
            string endpointUri = Environment.GetEnvironmentVariable("EndpointUri");
            string primaryKey = Environment.GetEnvironmentVariable("PrimaryKey");
            _client = new DocumentClient(new Uri(endpointUri), primaryKey, connectionPolicy);
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteDataElementDocuments(string instanceGuid)
        {
            if (!_clientConnectionEstablished)
            {
                _clientConnectionEstablished = await ConnectClient();
            }

            Uri collectionUri = UriFactory.CreateDocumentCollectionUri(databaseId, dataElementsCollectionId);
            IDocumentQuery<Document> query = _client.CreateDocumentQuery(collectionUri, new FeedOptions { PartitionKey = new PartitionKey(instanceGuid) }).AsDocumentQuery();

            try
            {
                while (query.HasMoreResults)
                {
                    FeedResponse<Document> res = await query.ExecuteNextAsync<Document>();
                    foreach (Document item in res)
                    {
                        await _client.DeleteDocumentAsync(item.SelfLink, new RequestOptions { PartitionKey = new PartitionKey(instanceGuid.ToString()) });
                    }
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.Message);
            }

            return false;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteInstanceDocument(string instanceGuid, string instanceOwnerPartyId)
        {
            if (!_clientConnectionEstablished)
            {
                _clientConnectionEstablished = await ConnectClient();
            }

            Uri documentUri = UriFactory.CreateDocumentUri(databaseId, instanceCollectionId, instanceGuid);

            try
            {
                await _client.DeleteDocumentAsync(documentUri, new RequestOptions { PartitionKey = new PartitionKey(instanceOwnerPartyId) });
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.Message);
            }

            return false;
        }

        /// <inheritdoc/>
        public async Task<List<Instance>> GetHardDeletedInstances()
        {
            if (!_clientConnectionEstablished)
            {
                _clientConnectionEstablished = await ConnectClient();
            }

            List<Instance> instances = new List<Instance>();
            FeedOptions feedOptions = new FeedOptions
            {
                EnableCrossPartitionQuery = true
            };

            IQueryable<Instance> filter;
            Uri instanceCollectionUri = UriFactory.CreateDocumentCollectionUri(databaseId, instanceCollectionId);

            filter = _client.CreateDocumentQuery<Instance>(instanceCollectionUri, feedOptions)
                .Where(i => (i.Status.HardDeleted.HasValue && i.Status.HardDeleted.Value <= DateTime.UtcNow.AddDays(-7)))
                .Where(i => i.CompleteConfirmations.Any(c => c.StakeholderId.ToLower().Equals(i.Org) && c.ConfirmedOn <= DateTime.UtcNow.AddDays(-7)) || i.Status.Archived == null);

            try
            {
                IDocumentQuery<Instance> query = filter.AsDocumentQuery();

                while (query.HasMoreResults)
                {
                    FeedResponse<Instance> feedResponse = await query.ExecuteNextAsync<Instance>();
                    instances.AddRange(feedResponse.ToList());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.Message);
            }

            // no post process requiered as the data is not exposed to the end user
            return instances;
        }

        private async Task<bool> ConnectClient()
        {
            await _client.OpenAsync();
            return true;
        }
    }
}
