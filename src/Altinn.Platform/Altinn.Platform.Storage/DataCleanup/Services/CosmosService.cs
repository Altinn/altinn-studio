using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Azure.Documents.SystemFunctions;
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
        private readonly string instanceEventsCollectionId = "instanceEvents";
        private readonly string dataElementsCollectionId = "dataElements";
        private readonly string applicationsCollectionId = "applications";

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
                _logger.LogError(ex, $"CosmosService // DeleteDataElementDocuments // Exeption: {ex.Message}");
                return false;
            }
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
                _logger.LogError(ex, $"CosmosService // DeleteInstanceDocument // Exeption: {ex.Message}");
                return false;
            }
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteInstanceEventDocuments(string instanceGuid, string instanceOwnerPartyId)
        {
            if (!_clientConnectionEstablished)
            {
                _clientConnectionEstablished = await ConnectClient();
            }

            string partitionKey = $"{instanceOwnerPartyId}/{instanceGuid}";

            Uri collectionUri = UriFactory.CreateDocumentCollectionUri(databaseId, instanceEventsCollectionId);
            IDocumentQuery<Document> query = _client
                .CreateDocumentQuery(collectionUri, new FeedOptions { PartitionKey = new PartitionKey(partitionKey) })
                .AsDocumentQuery();

            try
            {
                while (query.HasMoreResults)
                {
                    FeedResponse<Document> res = await query.ExecuteNextAsync<Document>();
                    foreach (Document item in res)
                    {
                        await _client.DeleteDocumentAsync(item.SelfLink, new RequestOptions { PartitionKey = new PartitionKey(partitionKey) });
                    }
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"CosmosService // DeleteInstanceEventDocuments // Exeption: {ex.Message}");
                return false;
            }
        }

        /// <inheritdoc/>
        public async Task<List<Instance>> GetAllInstancesOfApp(string app)
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
                .Where(i => i.AppId.Equals($"ttd/{app}"));

            try
            {
                IDocumentQuery<Instance> query = filter.AsDocumentQuery();

                while (query.HasMoreResults && instances.Count < 10000)
                {
                    FeedResponse<Instance> feedResponse = await query.ExecuteNextAsync<Instance>();
                    instances.AddRange(feedResponse.ToList());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"CosmosService // GetAllInstancesOfApp ttd/{app} // Exeption: {ex.Message}");
            }

            // no post process requiered as the data is not exposed to the end user
            return instances;
        }

        /// <inheritdoc/>
        public async Task<List<Application>> GetApplications(List<string> applicationIds)
        {
            if (!_clientConnectionEstablished)
            {
                _clientConnectionEstablished = await ConnectClient();
            }

            applicationIds = applicationIds.Select(id => id = AppIdToCosmosId(id)).ToList();

            List<Application> applications = new List<Application>();
            FeedOptions feedOptions = new FeedOptions
            {
                EnableCrossPartitionQuery = true
            };

            IQueryable<Application> filter;
            Uri applicationsCollectionUri = UriFactory.CreateDocumentCollectionUri(databaseId, applicationsCollectionId);

            filter = _client.CreateDocumentQuery<Application>(applicationsCollectionUri, feedOptions)
                .Where(a => applicationIds.Contains(a.Id));

            try
            {
                IDocumentQuery<Application> query = filter.AsDocumentQuery();

                while (query.HasMoreResults)
                {
                    FeedResponse<Application> feedResponse = await query.ExecuteNextAsync<Application>();
                    applications.AddRange(feedResponse);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"CosmosService // GetApplications // Exeption: {ex.Message}");
            }

            applications.ForEach(a => a.Id = CosmosIdToAppId(a.Id));

            return applications;
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
                .Where(i => i.Status.IsHardDeleted && i.Status.HardDeleted.Value <= DateTime.UtcNow.AddDays(-7))
                .Where(i => i.CompleteConfirmations.Any(c => c.StakeholderId.ToLower().Equals(i.Org) && c.ConfirmedOn <= DateTime.UtcNow.AddDays(-7)) || !i.Status.IsArchived);

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
                _logger.LogError(ex, $"CosmosService // GetHardDeletedInstances // Exeption: {ex.Message}");
            }

            // no post process requiered as the data is not exposed to the end user
            return instances;
        }

        private string AppIdToCosmosId(string appId)
        {
            string cosmosId = appId;

            if (appId != null && appId.Contains("/"))
            {
                string[] parts = appId.Split("/");

                cosmosId = $"{parts[0]}-{parts[1]}";
            }

            return cosmosId;
        }

        private string CosmosIdToAppId(string cosmosId)
        {
            string appId = cosmosId;

            int firstDash = cosmosId.IndexOf("-");

            if (firstDash > 0)
            {
                string app = cosmosId.Substring(firstDash + 1);
                string org = cosmosId.Split("-")[0];

                appId = $"{org}/{app}";
            }

            return appId;
        }

        private async Task<bool> ConnectClient()
        {
            await _client.OpenAsync();
            return true;
        }
    }
}
