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
        private readonly ILogger logger;
        private readonly Uri databaseUri;
        private readonly Uri collectionUri;
        private readonly string collectionId = "events";
        private readonly string partitionKey = "/subject";
        private readonly string triggerId = "trgUpdateItemTimestamp";
        private static DocumentClient client;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsRepository"/> class.
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        /// <param name="logger">dependency injection of logger</param>
        public EventsRepository(IOptions<AzureCosmosSettings> cosmosettings, ILogger<EventsRepository> logger)
        {
            this.logger = logger;

            var database = new CosmosDatabaseHandler(cosmosettings.Value);

            client = database.CreateDatabaseAndCollection(collectionId);
            collectionUri = database.CollectionUri;
            databaseUri = database.DatabaseUri;

            DocumentCollection documentCollection = database.CreateDocumentCollection(collectionId, partitionKey);

            client.CreateDocumentCollectionIfNotExistsAsync(
                databaseUri,
                documentCollection).GetAwaiter().GetResult();
            InsertTrigger();
            client.OpenAsync();
        }

        /// <inheritdoc/>
        public async Task<string> Create(CloudEvent item)
        {
            ResourceResponse<Document> createDocumentResponse = await client.CreateDocumentAsync(
                collectionUri, 
                item, 
                new RequestOptions { PreTriggerInclude = new List<string> { "trgUpdateItemTimestamp" } });
            return createDocumentResponse.Resource.Id;
        }

        private void InsertTrigger()
        {
            try
            {
                Trigger trigger = new Trigger();
                trigger.Id = triggerId;
                trigger.Body = File.ReadAllText("./Configuration/UpdateItemTimestamp.js");
                trigger.TriggerOperation = TriggerOperation.Create;
                trigger.TriggerType = TriggerType.Pre;
                client.CreateTriggerAsync(collectionUri, trigger).GetAwaiter().GetResult();
            } 
            catch (DocumentClientException e) 
            {
                if (e.StatusCode == System.Net.HttpStatusCode.Conflict) 
                {
                    logger.LogInformation("Trigger already exists, triggerId: " + triggerId);
                }
                else 
                {
                    logger.LogCritical($"Unable to create trigger {triggerId} in database. {e}");
                    throw;
                }
            }
        }
    }
}