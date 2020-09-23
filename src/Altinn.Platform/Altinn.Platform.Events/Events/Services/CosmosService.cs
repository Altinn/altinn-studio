using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Services
{
    /// <inheritdoc/>
    public class CosmosService : ICosmosService
    {
        private readonly string _collectionId = "events";
        private readonly string _partitionKey = "/subject";
        private readonly List<string> _triggers = new List<string>();
        private readonly DocumentClient _client;
        private readonly Uri _collectionUri;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CosmosService"/> class.
        /// </summary>
        public CosmosService(IOptions<AzureCosmosSettings> cosmosettings, ILogger<CosmosService> logger)
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
        public async Task<string> StoreEventsDocument(CloudEvent cloudEvent, bool applyTrigger = true)
        {
            RequestOptions options = new RequestOptions();

            if (applyTrigger)
            {
                options.PreTriggerInclude = _triggers;
            }

            ResourceResponse<Document> createDocumentResponse = await _client.CreateDocumentAsync(
                _collectionUri,
                cloudEvent,
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
                    string message = $"Unable to create trigger {trigger.Id} in database.";
                    _logger.LogCritical(message);
                    return false;
                }
            }
            catch (DocumentClientException e)
            {
                if (e.StatusCode == System.Net.HttpStatusCode.Conflict)
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
