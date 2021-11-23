namespace Altinn.Platform.Storage.Repository
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;

    using Altinn.Platform.Storage.Configuration;
    using Altinn.Platform.Storage.Extensions;

    using Microsoft.Azure.Documents;
    using Microsoft.Azure.Documents.Client;
    using Microsoft.Extensions.Hosting;
    using Microsoft.Extensions.Options;

    /// <summary>
    /// Base repository service for initializing db, collections etc.
    /// </summary>
    internal abstract class BaseRepository : IHostedService, IDisposable
    {
        private readonly string _collectionId;
        private readonly string _partitionKey;
        private readonly AzureCosmosSettings _cosmosSettings;

        /// <summary>
        /// Database name
        /// </summary>
        protected string DatabaseId { get; private set; }

        /// <summary>
        /// Database uri.
        /// </summary>
        protected Uri DatabaseUri { get; private set; }

        /// <summary>
        /// Collection uri.
        /// </summary>
        protected Uri CollectionUri { get; private set; }

        /// <summary>
        /// The DocumentClient.
        /// </summary>
        protected DocumentClient Client { get; private set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="BaseRepository"/> class.
        /// </summary>
        /// <param name="collectionId">The ID of the collection.</param>
        /// <param name="partitionKey">The PK of the collection.</param>
        /// <param name="cosmosSettings">The settings object.</param>
        public BaseRepository(string collectionId, string partitionKey, IOptions<AzureCosmosSettings> cosmosSettings)
        {
            _collectionId = collectionId;
            _partitionKey = partitionKey;
            _cosmosSettings = cosmosSettings.Value;

            DatabaseId = _cosmosSettings.Database;
            DatabaseUri = UriFactory.CreateDatabaseUri(DatabaseId);
            CollectionUri = UriFactory.CreateDocumentCollectionUri(DatabaseId, collectionId);
        }

        /// <inheritdoc/>
        public async Task StartAsync(CancellationToken cancellationToken)
        {
            Client = await CreateDatabaseAndCollection(cancellationToken);

            var documentCollection = CreateDocumentCollection();

            await Client.CreateDocumentCollectionIfNotExistsAsync(DatabaseUri, documentCollection)
                .WithCancellation(cancellationToken);

            await Client.OpenAsync(cancellationToken);
        }

        /// <inheritdoc/>
        public Task StopAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        private async Task<DocumentClient> CreateDatabaseAndCollection(CancellationToken cancellationToken)
        {
            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
                IdleTcpConnectionTimeout = new TimeSpan(0, 10, 0)
            };

            DocumentClient client = new DocumentClient(new Uri(_cosmosSettings.EndpointUri), _cosmosSettings.PrimaryKey, connectionPolicy);
            DatabaseUri = UriFactory.CreateDatabaseUri(DatabaseId);
            CollectionUri = UriFactory.CreateDocumentCollectionUri(DatabaseId, _collectionId);

            await client.CreateDatabaseIfNotExistsAsync(new Database { Id = DatabaseId })
                .WithCancellation(cancellationToken);

            return client;
        }

        private DocumentCollection CreateDocumentCollection()
        {
            DocumentCollection documentCollection = new DocumentCollection { Id = _collectionId };
            documentCollection.PartitionKey.Paths.Add(_partitionKey);

            return documentCollection;
        }

        /// <inheritdoc/>
        public void Dispose() => Client?.Dispose();
    }
}
