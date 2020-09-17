using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

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
        private readonly string databaseId;
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
            databaseId = database.DatabaseName;

            DocumentCollection documentCollection = database.CreateDocumentCollection(collectionId, partitionKey);

            client.CreateDocumentCollectionIfNotExistsAsync(
                databaseUri,
                documentCollection).GetAwaiter().GetResult();
            logger.LogInformation("Before InsertTrigger");
            logger.LogInformation("CollectionURI: " + collectionUri);
            InsertTrigger();
            client.OpenAsync();
        }

        /// <inheritdoc/>
        public async Task<string> Create(CloudEvent item)
        {
            ResourceResponse<Document> createDocumentResponse = await client.CreateDocumentAsync(collectionUri, item, new RequestOptions { PreTriggerInclude = new List<string> { "trgUpdateItemTimestamp" } });
            Document document = createDocumentResponse.Resource;
/*             CloudEvent instance = JsonConvert.DeserializeObject<CloudEvent>(document.ToString());
            logger.LogInformation("Time from saved object: " + instance.Time); */
            return createDocumentResponse.Resource.Id;
        }

        private async void InsertTrigger()
        {
            Trigger trigger = new Trigger();
            trigger.Id = "trgUpdateItemTimestamp";
            trigger.Body = File.ReadAllText("./Configuration/UpdateItemTimestamp.js");
            trigger.TriggerOperation = TriggerOperation.Create;
            trigger.TriggerType = TriggerType.Pre;
            ResourceResponse<Trigger> response = await client.CreateTriggerAsync(collectionUri, trigger);
            logger.LogInformation("Statuskode: " + response.StatusCode);
/*             await client.CreateTriggerAsync(new Microsoft.Azure.Management.ContainerRegistry.Fluent.TriggerProperties
            {
                Id = "trgPreValidateToDoItemTimestamp",
                Body = File.ReadAllText("@..\js\trgPreValidateToDoItemTimestamp.js"),
                TriggerOperation = TriggerOperation.Create,
                TriggerType = TriggerType.Pre
            });
            ResourceResponse<Trigger> response = await client.CreateTriggerAsync(collectionId, "triggerLink"); */
        }
    }
}