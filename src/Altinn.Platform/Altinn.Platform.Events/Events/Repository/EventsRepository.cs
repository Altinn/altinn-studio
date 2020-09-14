using System;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using CloudNative.CloudEvents;
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

            client.OpenAsync();
        }

        /// <summary>
        /// Converts the subject "party/{party-id}" to "{party}-{party-id}"
        /// </summary>
        /// <param name="subject">the id to convert</param>
        /// <returns>the converted id</returns>
        private string SubjectToCosmosId(string subject)
        {
            string cosmosId = subject;

            if (subject != null && subject.Contains("/"))
            {
                string[] parts = subject.Split("/");

                cosmosId = $"{parts[0]}-{parts[1]}";
            }

            return cosmosId;
        }

        /// <inheritdoc/>
        public async Task<string> Create(CloudEvent item)
        {
            item.Subject = SubjectToCosmosId(item.Subject);

            ResourceResponse<Document> createDocumentResponse = await client.CreateDocumentAsync(collectionUri, item);
            Document document = createDocumentResponse.Resource;
            return createDocumentResponse.Resource.Id;
        }
    }
}