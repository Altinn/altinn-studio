using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
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

        private readonly ILogger<ICosmosService> _logger;

        private bool _clientConnectionEstablished = false;

        private readonly Container instancesContainer = null;
        private readonly Container instanceEventsContainer = null;
        private readonly Container dataElementsContainer = null;
        private readonly Container applicationsContainer = null;

        /// <summary>
        /// Initializes a new instance of the <see cref="CosmosService"/> class.
        /// </summary>
        /// <param name="logger">The logger</param>
        public CosmosService(ILogger<ICosmosService> logger)
        {
            _logger = logger;

            CosmosClientOptions options = new CosmosClientOptions()
            {
                ConnectionMode = ConnectionMode.Gateway,
            };

            CosmosClient client = new CosmosClient(
                Environment.GetEnvironmentVariable("EndpointUri"),
                Environment.GetEnvironmentVariable("PrimaryKey"),
                options);

            instancesContainer = client.GetContainer(databaseId, instanceCollectionId);
            instanceEventsContainer = client.GetContainer(databaseId, instanceEventsCollectionId);
            dataElementsContainer = client.GetContainer(databaseId, dataElementsCollectionId);
            applicationsContainer = client.GetContainer(databaseId, applicationsCollectionId);
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteDataElementDocuments(string instanceGuid)
        {
            QueryRequestOptions options = new QueryRequestOptions()
            {
                PartitionKey = new PartitionKey(instanceGuid)
            };

            IQueryable<DataElement> query = dataElementsContainer.GetItemLinqQueryable<DataElement>(requestOptions: options)
               .Where(de => de.InstanceGuid == instanceGuid);

            try
            {
                var iterator = query.ToFeedIterator();
                while (iterator.HasMoreResults)
                {
                    FeedResponse<DataElement> response = await iterator.ReadNextAsync();
                    foreach (DataElement item in response)
                    {
                        await dataElementsContainer.DeleteItemAsync<DataElement>(item.Id, new PartitionKey(instanceGuid));
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
        public async Task DeleteDataElementDocument(string instanceGuid, string dataElementId)
        {
            await dataElementsContainer.DeleteItemAsync<DataElement>(dataElementId, new PartitionKey(instanceGuid));
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteInstanceDocument(string instanceOwnerPartyId, string instanceGuid)
        {
            var res = await instancesContainer.DeleteItemAsync<Instance>(instanceGuid, new PartitionKey(instanceOwnerPartyId));
            return res.StatusCode == HttpStatusCode.NoContent;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteInstanceEventDocuments(string instanceOwnerPartyId, string instanceGuid)
        {
            string partitionKey = $"{instanceOwnerPartyId}/{instanceGuid}";
            QueryRequestOptions options = new QueryRequestOptions()
            {
                PartitionKey = new PartitionKey(partitionKey)
            };

            IQueryable<InstanceEvent> query = dataElementsContainer.GetItemLinqQueryable<InstanceEvent>(requestOptions: options);

            try
            {
                var iterator = query.ToFeedIterator();
                while (iterator.HasMoreResults)
                {
                    FeedResponse<InstanceEvent> response = await iterator.ReadNextAsync();
                    foreach (InstanceEvent item in response)
                    {
                        await instanceEventsContainer.DeleteItemAsync<InstanceEvent>(item.Id.ToString(), new PartitionKey(partitionKey));
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
            List<Instance> instances = new List<Instance>();

            IQueryable<Instance> query = instancesContainer.GetItemLinqQueryable<Instance>()
                .Where(i => i.AppId.Equals($"ttd/{app}"));

            try
            {
                var iterator = query.ToFeedIterator();

                while (iterator.HasMoreResults)
                {
                    FeedResponse<Instance> response = await iterator.ReadNextAsync();
                    instances.AddRange(response);
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
            applicationIds = applicationIds.Select(id => id = AppIdToCosmosId(id)).ToList();

            List<Application> applications = new List<Application>();

            IQueryable<Application> query = applicationsContainer.GetItemLinqQueryable<Application>()
                .Where(a => applicationIds.Contains(a.Id));

            try
            {
                var iterator = query.ToFeedIterator();

                while (iterator.HasMoreResults)
                {
                    FeedResponse<Application> response = await iterator.ReadNextAsync();
                    applications.AddRange(response);
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
            List<Instance> instances = new List<Instance>();

            IQueryable<Instance> query = instancesContainer.GetItemLinqQueryable<Instance>()
                .Where(i => i.Status.IsHardDeleted && i.Status.HardDeleted.Value <= DateTime.UtcNow.AddDays(-7))
                .Where(i => i.CompleteConfirmations.Any(c => c.StakeholderId.ToLower().Equals(i.Org) && c.ConfirmedOn <= DateTime.UtcNow.AddDays(-7)) || !i.Status.IsArchived);

            try
            {
                var iterator = query.ToFeedIterator();

                while (iterator.HasMoreResults)
                {
                    FeedResponse<Instance> response = await iterator.ReadNextAsync();
                    instances.AddRange(response);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"CosmosService // GetHardDeletedInstances // Exeption: {ex.Message}");
            }

            // no post process requiered as the data is not exposed to the end user
            return instances;
        }

        /// <inheritdoc/>
        public async Task<List<DataElement>> GetHardDeletedDataElements()
        {
            List<DataElement> dataElements = new List<DataElement>();

            IQueryable<DataElement> query = dataElementsContainer.GetItemLinqQueryable<DataElement>()
                .Where(d => d.DeleteStatus.IsHardDeleted && d.DeleteStatus.HardDeleted <= DateTime.UtcNow.AddDays(-7));

            try
            {
                var iterator = query.ToFeedIterator();
                while (iterator.HasMoreResults)
                {
                    Dictionary<string, Instance> retrievedInstances = new Dictionary<string, Instance>();
                    FeedResponse<DataElement> response = await iterator.ReadNextAsync();

                    foreach (DataElement dataElement in response)
                    {
                        if (retrievedInstances.ContainsKey(dataElement.InstanceGuid))
                        {
                            if (retrievedInstances[dataElement.InstanceGuid].CompleteConfirmations.Any(
                                c => c.StakeholderId.ToLower().Equals(retrievedInstances[dataElement.InstanceGuid].Org) && c.ConfirmedOn <= DateTime.UtcNow.AddDays(-7)))
                            {
                                dataElements.Add(dataElement);
                            }
                        }
                        else
                        {
                            IQueryable<Instance> instanceQuery = instancesContainer.GetItemLinqQueryable<Instance>()
                                .Where(i => i.Id.Equals(dataElement.InstanceGuid));

                            var instanceIterator = instanceQuery.ToFeedIterator();
                            var res = await instanceIterator.ReadNextAsync();
                            Instance instance = res.FirstOrDefault();

                            retrievedInstances.Add(instance.Id, instance);
                            if (instance.CompleteConfirmations.Any(c => c.StakeholderId.ToLower().Equals(instance.Org) && c.ConfirmedOn <= DateTime.UtcNow.AddDays(-7)))
                            {
                                dataElements.Add(dataElement);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"CosmosService // GetHardDeletedDataElements // Exeption: {ex.Message}");
            }

            return dataElements;
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
    }
}
