using System;
using Altinn.Platform.Storage.Configuration;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Makes sure all repositories
    /// </summary>
    public class CosmosDatabaseHandler
    {
        private readonly AzureCosmosSettings cosmosSettings;

        /// <summary>
        /// Cosmos database handler
        /// </summary>
        public CosmosDatabaseHandler(AzureCosmosSettings cosmosSettings)
        {
            this.cosmosSettings = cosmosSettings;
        }

        /// <summary>
        /// Database name
        /// </summary>
        public string DatabaseName { get; set; }

        /// <summary>
        /// Database uri.
        /// </summary>
        public Uri DatabaseUri { get; set; }

        /// <summary>
        /// Collection uri.
        /// </summary>
        public Uri CollectionUri { get; set; }

        /// <summary>
        /// Create document client.
        /// </summary>
        /// <returns></returns>
        public DocumentClient CreateDatabaseAndCollection(string collectionId)
        {
            string databaseId = cosmosSettings.Database;

            DatabaseName = databaseId;

            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            };

            DocumentClient client = new DocumentClient(new Uri(cosmosSettings.EndpointUri), cosmosSettings.PrimaryKey, connectionPolicy);
            DatabaseUri = UriFactory.CreateDatabaseUri(databaseId);
            CollectionUri = UriFactory.CreateDocumentCollectionUri(databaseId, collectionId);

            client.CreateDatabaseIfNotExistsAsync(new Database { Id = databaseId }).GetAwaiter().GetResult();

            return client;
        }

        /// <summary>
        /// Create document collection.
        /// </summary>
        /// <returns></returns>
        public DocumentCollection CreateDocumentCollection(string collectionId, string partitionKey)
        {
            DocumentCollection documentCollection = new DocumentCollection { Id = collectionId };
            documentCollection.PartitionKey.Paths.Add(partitionKey);

            return documentCollection;
        }
    }
}
