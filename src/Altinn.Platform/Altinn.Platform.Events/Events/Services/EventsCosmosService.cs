using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Services
{
    /// <summary>
    /// Class that handles storing and retrieving documents from Cosmos DB.
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class EventsCosmosService : IEventsCosmosService
    {
        private readonly string _collectionId = "events";
        private readonly string _partitionKey = "/subject";
        private readonly List<string> _triggers = new List<string>();
        private readonly DocumentClient _client;
        private readonly Uri _collectionUri;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsCosmosService"/> class.
        /// </summary>
        public EventsCosmosService(IOptions<AzureCosmosSettings> cosmosettings, ILogger<EventsCosmosService> logger)
        {
            CosmosDatabaseHandler database = new CosmosDatabaseHandler(cosmosettings.Value);

            _client = database.CreateDatabaseAndCollection(_collectionId);
            _collectionUri = database.CollectionUri;

            DocumentCollection documentCollection = database.CreateDocumentCollection(_collectionId, _partitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                database.DatabaseUri,
                documentCollection).GetAwaiter().GetResult();
            _client.OpenAsync();

            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> StoreItemtToEventsCollection<T>(T item, bool applyTrigger = true)
        {
            RequestOptions options = new RequestOptions();

            if (applyTrigger)
            {
                options.PreTriggerInclude = _triggers;
            }

            ResourceResponse<Document> createDocumentResponse = await _client.CreateDocumentAsync(
                _collectionUri,
                item,
                options);

            return createDocumentResponse.Resource.Id;
        }

        /// <inheritdoc/>
        public async Task<bool> StoreTrigger(Trigger trigger)
        {
            try
            {
                ResourceResponse<Trigger> res = await _client.CreateTriggerAsync(_collectionUri, trigger);
                if (res.StatusCode.Equals(HttpStatusCode.Created))
                {
                    _triggers.Add(trigger.Id);
                    return true;
                }
                else
                {
                    string message = $"Unable to create trigger {trigger.Id} in database. Status code {res.StatusCode}.";
                    _logger.LogCritical(message);
                    throw new InvalidOperationException(message);
                }
            }
            catch (DocumentClientException e)
            {
                if (e.StatusCode == HttpStatusCode.Conflict)
                {
                    _logger.LogInformation("Trigger already exists, triggerId: " + trigger.Id);
                    return true;
                }
                else
                {
                    _logger.LogCritical($"Unable to create trigger {trigger.Id} in database. {e}");
                    throw;
                }
            }
        }
    }
}
