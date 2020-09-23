using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Handles events repository. Notice that the all methods should modify the Subject attribute of the
    /// CloudEvent, since cosmosDb fails if Subject contains slashes '/'.
    /// </summary>
    public class EventsRepository : IEventsRepository
    {
        private readonly ILogger _logger;
        private readonly Uri _collectionUri;
        private readonly string _collectionId = "events";
        private readonly string _partitionKey = "/subject";
        private readonly string _triggerId = "trgUpdateItemTimestamp";
        private readonly DocumentClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsRepository"/> class.
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        /// <param name="logger">dependency injection of logger</param>
        public EventsRepository(IOptions<AzureCosmosSettings> cosmosettings, ILogger<EventsRepository> logger)
        {
            this._logger = logger;

            CosmosDatabaseHandler database = new CosmosDatabaseHandler(cosmosettings.Value);

            _client = database.CreateDatabaseAndCollection(_collectionId);
            _collectionUri = database.CollectionUri;

            DocumentCollection documentCollection = database.CreateDocumentCollection(_collectionId, _partitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                database.DatabaseUri,
                documentCollection).GetAwaiter().GetResult();
            InsertTrigger();
            _client.OpenAsync();
        }

        /// <inheritdoc/>
        public async Task<string> Create(CloudEvent item)
        {
            ResourceResponse<Document> createDocumentResponse = await _client.CreateDocumentAsync(
                _collectionUri, 
                item, 
                new RequestOptions { PreTriggerInclude = new List<string> { _triggerId } });
            return createDocumentResponse.Resource.Id;
        }

        private void InsertTrigger()
        {
            try
            {
                Trigger trigger = new Trigger();
                trigger.Id = _triggerId;
                trigger.Body = File.ReadAllText("./Configuration/UpdateItemTimestamp.js");
                trigger.TriggerOperation = TriggerOperation.Create;
                trigger.TriggerType = TriggerType.Pre;
                _client.CreateTriggerAsync(_collectionUri, trigger).GetAwaiter().GetResult();
            } 
            catch (DocumentClientException e) 
            {
                if (e.StatusCode == System.Net.HttpStatusCode.Conflict) 
                {
                    _logger.LogInformation("Trigger already exists, triggerId: " + _triggerId);
                }
                else 
                {
                    _logger.LogCritical($"Unable to create trigger {_triggerId} in database. {e}");
                    throw;
                }
            }
        }
    }
}
