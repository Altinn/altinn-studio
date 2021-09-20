using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Repository operations for application instances.
    /// </summary>
    internal sealed class InstanceRepository : BaseRepository, IInstanceRepository
    {
        private const string CollectionId = "instances";
        private const string PartitionKey = "/instanceOwner/partyId";

        private readonly ILogger<InstanceRepository> _logger;
        private readonly IDataRepository _dataRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceRepository"/> class
        /// </summary>
        /// <param name="cosmosSettings">the configuration settings for cosmos database</param>
        /// <param name="logger">the logger</param>
        /// <param name="dataRepository">the data repository to fetch data elements from</param>
        public InstanceRepository(
            IOptions<AzureCosmosSettings> cosmosSettings,
            ILogger<InstanceRepository> logger,
            IDataRepository dataRepository)
            : base(CollectionId, PartitionKey, cosmosSettings)
        {
            _logger = logger;
            _dataRepository = dataRepository;
        }

        /// <inheritdoc/>
        public async Task<Instance> Create(Instance instance)
        {
            PreProcess(instance);

            ResourceResponse<Document> createDocumentResponse = await Client.CreateDocumentAsync(CollectionUri, instance);
            Document document = createDocumentResponse.Resource;
            Instance instanceStored = JsonConvert.DeserializeObject<Instance>(document.ToString());

            await PostProcess(instanceStored);

            return instanceStored;
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(Instance item)
        {
            PreProcess(item);

            Uri uri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, item.Id);

            await Client.DeleteDocumentAsync(
                uri.ToString(),
                new RequestOptions { PartitionKey = new PartitionKey(item.InstanceOwner.PartyId) });

            return true;
        }

        /// <inheritdoc/>
        public async Task<InstanceQueryResponse> GetInstancesFromQuery(
            Dictionary<string, StringValues> queryParams,
            string continuationToken,
            int size)
        {
            InstanceQueryResponse queryResponse = new InstanceQueryResponse
            {
                Count = 0,
                Instances = new List<Instance>()
            };

            while (queryResponse.Count < size)
            {
                FeedOptions feedOptions = new FeedOptions
                {
                    EnableCrossPartitionQuery = true,
                    MaxItemCount = size - queryResponse.Count,
                    ResponseContinuationTokenLimitInKb = 7
                };

                if (!string.IsNullOrEmpty(continuationToken))
                {
                    feedOptions.RequestContinuation = continuationToken;
                }

                IQueryable<Instance> queryBuilder = Client.CreateDocumentQuery<Instance>(CollectionUri, feedOptions);

                try
                {
                    queryBuilder = BuildQueryFromParameters(queryParams, queryBuilder);
                }
                catch (Exception e)
                {
                    queryResponse.Exception = e.Message;
                    return queryResponse;
                }

                try
                {
                    IDocumentQuery<Instance> documentQuery = queryBuilder.AsDocumentQuery();

                    FeedResponse<Instance> feedResponse = await documentQuery.ExecuteNextAsync<Instance>();
                    if (feedResponse.Count == 0 && !documentQuery.HasMoreResults)
                    {
                        queryResponse.ContinuationToken = string.Empty;
                        break;
                    }

                    List<Instance> instances = feedResponse.ToList();
                    await PostProcess(instances);
                    queryResponse.Instances.AddRange(instances);
                    queryResponse.Count += instances.Count;

                    if (string.IsNullOrEmpty(feedResponse.ResponseContinuation))
                    {
                        queryResponse.ContinuationToken = string.Empty;
                        break;
                    }

                    queryResponse.ContinuationToken = feedResponse.ResponseContinuation;
                    continuationToken = feedResponse.ResponseContinuation;
                }
                catch (Exception e)
                {
                    _logger.LogError(e, "Exception querying CosmosDB for instances");
                    queryResponse.Exception = e.Message;
                    break;
                }
            }

            return queryResponse;
        }

        private IQueryable<Instance> BuildQueryFromParameters(Dictionary<string, StringValues> queryParams, IQueryable<Instance> queryBuilder)
        {
            foreach (KeyValuePair<string, StringValues> param in queryParams)
            {
                string queryParameter = param.Key;
                StringValues queryValues = param.Value;

                if (queryParameter.Equals("appId"))
                {
                    queryBuilder = queryBuilder.Where(i => queryValues.Contains(i.AppId));
                    continue;
                }

                if (queryParameter.Equals("instanceOwner.partyId"))
                {
                    queryBuilder = queryBuilder.Where(i => queryValues.Contains(i.InstanceOwner.PartyId));
                    continue;
                }

                foreach (string queryValue in queryValues)
                {
                    switch (queryParameter)
                    {
                        case "size":
                        case "continuationToken":
                            // handled outside this method, it is a valid parameter.
                            break;
                        case "org":
                            queryBuilder = queryBuilder.Where(i => i.Org == queryValue);
                            break;
                        case "lastChanged":
                            queryBuilder = QueryBuilderForLastChangedDateTime(queryBuilder, queryValue);
                            break;

                        case "dueBefore":
                            queryBuilder = QueryBuilderForDueBefore(queryBuilder, queryValue);
                            break;

                        case "visibleAfter":
                            queryBuilder = QueryBuilderForVisibleAfter(queryBuilder, queryValue);
                            break;

                        case "created":
                            queryBuilder = QueryBuilderForCreated(queryBuilder, queryValue);
                            break;

                        case "process.currentTask":
                            queryBuilder = queryBuilder.Where(i => i.Process.CurrentTask.ElementId == queryValue);
                            break;

                        case "process.isComplete":
                            bool isComplete = bool.Parse(queryValue);
                            if (isComplete)
                            {
                                queryBuilder = queryBuilder.Where(i => i.Process.Ended != null);
                            }
                            else
                            {
                                queryBuilder = queryBuilder.Where(i => i.Process.CurrentTask != null);
                            }

                            break;

                        case "process.ended":
                            queryBuilder = QueryBuilderForEnded(queryBuilder, queryValue);
                            break;

                        case "excludeConfirmedBy":
                            queryBuilder = QueryBuilderExcludeConfirmedBy(queryBuilder, queryValue);
                            break;
                        case "language":
                            break;
                        case "status.isArchived":
                            bool isArchived = bool.Parse(queryValue);
                            queryBuilder = queryBuilder.Where(i => i.Status.IsArchived == isArchived);

                            break;
                        case "status.isSoftDeleted":
                            bool isSoftDeleted = bool.Parse(queryValue);
                            queryBuilder = queryBuilder.Where(i => i.Status.IsSoftDeleted == isSoftDeleted);

                            break;
                        case "status.isHardDeleted":
                            bool isHardDeleted = bool.Parse(queryValue);
                            queryBuilder = queryBuilder.Where(i => i.Status.IsHardDeleted == isHardDeleted);

                            break;
                        case "status.isArchivedOrSoftDeleted":
                            if (bool.Parse(queryValue))
                            {
                                queryBuilder = queryBuilder.Where(i => i.Status.IsArchived || i.Status.IsSoftDeleted);
                            }

                            break;
                        case "status.isActiveorSoftDeleted":
                            if (bool.Parse(queryValue))
                            {
                                queryBuilder = queryBuilder.Where(i => !i.Status.IsArchived || i.Status.IsSoftDeleted);
                            }

                            break;
                        case "sortBy":
                            queryBuilder = QueryBuilderForSortBy(queryBuilder, queryValue);

                            break;
                        case "archiveReference":
                            queryBuilder = queryBuilder.Where(i => i.Id.EndsWith(queryValue.ToLower()));

                            break;
                        default:
                            throw new ArgumentException($"Unknown query parameter: {queryParameter}");
                    }
                }
            }

            return queryBuilder;
        }

        // Limitations in queryBuilder.Where interface forces me to duplicate the datetime methods
        private IQueryable<Instance> QueryBuilderForDueBefore(IQueryable<Instance> queryBuilder, string queryValue)
        {
            DateTime dateValue;

            if (queryValue.StartsWith("gt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.DueBefore > dateValue);
            }

            if (queryValue.StartsWith("gte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.DueBefore >= dateValue);
            }

            if (queryValue.StartsWith("lt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.DueBefore < dateValue);
            }

            if (queryValue.StartsWith("lte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.DueBefore <= dateValue);
            }

            if (queryValue.StartsWith("eq:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.DueBefore == dateValue);
            }

            dateValue = ParseDateTimeIntoUtc(queryValue);
            return queryBuilder.Where(i => i.DueBefore == dateValue);
        }

        // Limitations in queryBuilder.Where interface forces me to duplicate the datetime methods
        private IQueryable<Instance> QueryBuilderForLastChangedDateTime(IQueryable<Instance> queryBuilder, string queryValue)
        {
            DateTime dateValue;

            if (queryValue.StartsWith("gt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.LastChanged > dateValue);
            }

            if (queryValue.StartsWith("gte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.LastChanged >= dateValue);
            }

            if (queryValue.StartsWith("lt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.LastChanged < dateValue);
            }

            if (queryValue.StartsWith("lte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.LastChanged <= dateValue);
            }

            if (queryValue.StartsWith("eq:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.LastChanged == dateValue);
            }

            dateValue = ParseDateTimeIntoUtc(queryValue);
            return queryBuilder.Where(i => i.LastChanged == dateValue);
        }

        // Limitations in queryBuilder.Where interface forces me to duplicate the datetime methods
        private IQueryable<Instance> QueryBuilderForEnded(IQueryable<Instance> queryBuilder, string queryValue)
        {
            DateTime dateValue;

            if (queryValue.StartsWith("gt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.Process.Ended > dateValue);
            }

            if (queryValue.StartsWith("gte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.Process.Ended >= dateValue);
            }

            if (queryValue.StartsWith("lt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.Process.Ended < dateValue);
            }

            if (queryValue.StartsWith("lte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.Process.Ended <= dateValue);
            }

            if (queryValue.StartsWith("eq:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.Process.Ended == dateValue);
            }

            dateValue = ParseDateTimeIntoUtc(queryValue);
            return queryBuilder.Where(i => i.Process.Ended == dateValue);
        }

        private IQueryable<Instance> QueryBuilderExcludeConfirmedBy(IQueryable<Instance> queryBuilder, string queryValue)
        {
            return queryBuilder.Where(i =>

                // A slightly more readable variant would be to use All( != ), but All() isn't supported.
                !i.CompleteConfirmations.Any(cc => cc.StakeholderId == queryValue));
        }

        private IQueryable<Instance> QueryBuilderForSortBy(IQueryable<Instance> queryBuilder, string queryValue)
        {
            string[] value = queryValue.Split(':');
            string direction = value[0].ToLower();
            string property = value[1];

            if (!direction.Equals("desc") && !direction.Equals("asc"))
            {
                throw new ArgumentException($"Invalid direction for sorting: {direction}");
            }

            switch (property)
            {
                case "lastChanged":
                    if (direction.Equals("desc"))
                    {
                        queryBuilder = queryBuilder.OrderByDescending(i => i.LastChanged);
                    }
                    else
                    {
                        queryBuilder = queryBuilder.OrderBy(i => i.LastChanged);
                    }

                    break;
                default:
                    throw new ArgumentException($"Cannot sort on property: {property}");
            }

            return queryBuilder;
        }

        // Limitations in queryBuilder.Where interface forces me to duplicate the datetime methods
        private IQueryable<Instance> QueryBuilderForCreated(IQueryable<Instance> queryBuilder, string queryValue)
        {
            DateTime dateValue;

            if (queryValue.StartsWith("gt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.Created > dateValue);
            }

            if (queryValue.StartsWith("gte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.Created >= dateValue);
            }

            if (queryValue.StartsWith("lt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.Created < dateValue);
            }

            if (queryValue.StartsWith("lte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.Created <= dateValue);
            }

            if (queryValue.StartsWith("eq:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.Created == dateValue);
            }

            dateValue = ParseDateTimeIntoUtc(queryValue);
            return queryBuilder.Where(i => i.Created == dateValue);
        }

        // Limitations in queryBuilder.Where interface forces me to duplicate the datetime methods
        private IQueryable<Instance> QueryBuilderForVisibleAfter(IQueryable<Instance> queryBuilder, string queryValue)
        {
            DateTime dateValue;

            if (queryValue.StartsWith("gt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.VisibleAfter > dateValue);
            }

            if (queryValue.StartsWith("gte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.VisibleAfter >= dateValue);
            }

            if (queryValue.StartsWith("lt:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.VisibleAfter < dateValue);
            }

            if (queryValue.StartsWith("lte:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(4));
                return queryBuilder.Where(i => i.VisibleAfter <= dateValue);
            }

            if (queryValue.StartsWith("eq:"))
            {
                dateValue = ParseDateTimeIntoUtc(queryValue.Substring(3));
                return queryBuilder.Where(i => i.VisibleAfter == dateValue);
            }

            dateValue = ParseDateTimeIntoUtc(queryValue);
            return queryBuilder.Where(i => i.VisibleAfter == dateValue);
        }

        private static DateTime ParseDateTimeIntoUtc(string queryValue)
        {
            return DateTimeHelper.ParseAndConvertToUniversalTime(queryValue);
        }

        /// <inheritdoc/>
        public async Task<Instance> GetOne(string instanceId, int instanceOwnerPartyId)
        {
            string cosmosId = InstanceIdToCosmosId(instanceId);
            Uri uri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, cosmosId);

            try
            {
                Instance instance = await Client
             .ReadDocumentAsync<Instance>(
                 uri,
                 new RequestOptions { PartitionKey = new PartitionKey(instanceOwnerPartyId.ToString()) });

                await PostProcess(instance);
                return instance;
            }
            catch (DocumentClientException e)
            {
                if (e.StatusCode == HttpStatusCode.NotFound)
                {
                    return null;
                }
                else
                {
                    throw;
                }
            }
        }

        /// <inheritdoc/>
        public async Task<Instance> Update(Instance item)
        {
            PreProcess(item);

            ResourceResponse<Document> createDocumentResponse = await Client
                .ReplaceDocumentAsync(UriFactory.CreateDocumentUri(DatabaseId, CollectionId, item.Id), item);
            Document document = createDocumentResponse.Resource;
            Instance instance = JsonConvert.DeserializeObject<Instance>(document.ToString());

            await PostProcess(instance);

            return instance;
        }

        /// <summary>
        /// Converts the instanceId (id) of the instance from {instanceOwnerPartyId}/{instanceGuid} to {instanceGuid} to use as id in cosmos.
        /// Ensures dataElements are not included in the document. 
        /// </summary>
        /// <param name="instance">the instance to preprocess</param>
        private void PreProcess(Instance instance)
        {
            instance.Id = InstanceIdToCosmosId(instance.Id);
            instance.Data = new List<DataElement>();
        }

        /// <summary>
        /// Prepares the instance for exposure to end users and app owners.
        /// </summary>
        /// <remarks>
        /// - Converts the instanceId (id) of the instance from {instanceGuid} to {instanceOwnerPartyId}/{instanceGuid} to be used outside cosmos.
        /// - Retrieves all data elements from data repository
        /// - Sets correct LastChanged/LastChangedBy by comparing instance and data elements
        /// </remarks>
        /// <param name="instance">the instance to preprocess</param>
        private async Task PostProcess(Instance instance)
        {
            Guid instanceGuid = Guid.Parse(instance.Id);
            string instanceId = $"{instance.InstanceOwner.PartyId}/{instance.Id}";

            instance.Id = instanceId;
            instance.Data = await _dataRepository.ReadAll(instanceGuid);
            if (instance.Data != null && instance.Data.Any())
            {
                SetReadStatus(instance);
            }

            (string lastChangedBy, DateTime? lastChanged) = InstanceHelper.FindLastChanged(instance);
            instance.LastChanged = lastChanged;
            instance.LastChangedBy = lastChangedBy;
        }

        /// <summary>
        /// Preprocess a list of instances.
        /// </summary>
        /// <param name="instances">the list of instances</param>
        private async Task PostProcess(List<Instance> instances)
        {
            foreach (Instance item in instances)
            {
                await PostProcess(item);
            }
        }

        /// <summary>
        /// An instanceId should follow this format {int}/{guid}.
        /// Cosmos does not allow / in id.
        /// But in some old cases instanceId is just {guid}.
        /// </summary>
        /// <param name="instanceId">the id to convert to cosmos</param>
        /// <returns>the guid of the instance</returns>
        private string InstanceIdToCosmosId(string instanceId)
        {
            string cosmosId = instanceId;

            if (instanceId != null && instanceId.Contains("/"))
            {
                cosmosId = instanceId.Split("/")[1];
            }

            return cosmosId;
        }

        private void SetReadStatus(Instance instance)
        {
            if (instance.Status.ReadStatus == ReadStatus.Read && instance.Data.Any(d => !d.IsRead))
            {
                instance.Status.ReadStatus = ReadStatus.UpdatedSinceLastReview;
            }
            else if (instance.Status.ReadStatus == ReadStatus.Read && !instance.Data.Any(d => d.IsRead))
            {
                instance.Status.ReadStatus = ReadStatus.Unread;
            }
        }
    }
}
