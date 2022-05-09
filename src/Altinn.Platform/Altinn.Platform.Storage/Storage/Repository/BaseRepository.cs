namespace Altinn.Platform.Storage.Repository
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;

    using Altinn.Platform.Storage.Configuration;

    using Microsoft.Azure.Cosmos;

    using Microsoft.Extensions.Hosting;
    using Microsoft.Extensions.Options;

    /// <summary>
    /// Base repository service for initializing db, collections etc.
    /// </summary>
    internal abstract class BaseRepository : IHostedService
    {
        private readonly string _databaseId;
        private readonly string _collectionId;
        private readonly string _partitionKey;
        private readonly AzureCosmosSettings _cosmosSettings;

        /// <summary>
        /// The document collection.
        /// </summary>
        protected Container Container { get; private set; }

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
            _databaseId = _cosmosSettings.Database;
        }

        /// <inheritdoc/>
        public async Task StartAsync(CancellationToken cancellationToken)
        {
            Container = await CreateDatabaseAndCollection(cancellationToken);
        }

        /// <inheritdoc/>
        public Task StopAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        private async Task<Container> CreateDatabaseAndCollection(CancellationToken cancellationToken)
        {
            CosmosClientOptions options = new()
            {
                ConnectionMode = ConnectionMode.Gateway,
            };

            CosmosClient client = new CosmosClient(_cosmosSettings.EndpointUri, _cosmosSettings.PrimaryKey, options);

            Database db = await client.CreateDatabaseIfNotExistsAsync(_databaseId, cancellationToken: cancellationToken);

            Container container = await db.CreateContainerIfNotExistsAsync(_collectionId, _partitionKey, cancellationToken: cancellationToken);
            return container;
        }
    }
}
