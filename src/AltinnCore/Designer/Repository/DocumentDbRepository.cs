using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.TypedHttpClients.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Repository
{
    /// <summary>
    /// Implementation of IDocumentDbRepository
    /// </summary>
    public class DocumentDbRepository : IDocumentDbRepository
    {
        private readonly IDocumentClient _documentClient;
        private readonly string _collection;
        private readonly string _database;
        private readonly Uri _collectionUri;
        private ILogger _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        public DocumentDbRepository(
            IOptions<Integrations> options,
            IDocumentClient documentClient,
            ILogger<DocumentDbRepository> logger)
        {
            var integrations = options.Value;
            _collection = integrations.AzureCosmosDbSettings.Collection;
            _database = integrations.AzureCosmosDbSettings.Database;
            _logger = logger;
            _documentClient = documentClient;

            var dbUri = UriFactory.CreateDatabaseUri(_database);
            _collectionUri = UriFactory.CreateDocumentCollectionUri(_database, _collection);

            _documentClient.CreateDatabaseIfNotExistsAsync(new Database { Id = _database }).GetAwaiter().GetResult();

            DocumentCollection documentCollection = new DocumentCollection { Id = _collection };

            _documentClient
                .CreateDocumentCollectionIfNotExistsAsync(dbUri, documentCollection)
                .GetAwaiter()
                .GetResult();
        }

        /// <inheritdoc/>
        public async Task<T> Create<T>(T item)
        {
            Document document = await _documentClient.CreateDocumentAsync(_collectionUri, item);
            return JsonConvert.DeserializeObject<T>(document.ToString());
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<T>> Get<T>(DocumentQueryModel query)
            where T : DocumentBase
        {
            var count = FindMaxItemCount(query.Count, 10);
            var feedOptions = new FeedOptions
            {
                MaxItemCount = count
            };
            var createdQuery = _documentClient.CreateDocumentQuery<T>(_collectionUri, feedOptions)
                .BuildQuery(query)
                .AsDocumentQuery();

            var result = await createdQuery.ExecuteNextAsync<T>();
            return result.ToList();
        }

        /// <inheritdoc/>
        public async Task Update<T>(T item)
            where T : DocumentBase
        {
            Uri uri = UriFactory.CreateDocumentUri(_database, _collection, item.Id);
            await _documentClient.ReplaceDocumentAsync(uri, item);
        }

        private static int FindMaxItemCount(int? queryCount, int maxItemCount)
        {
            if (queryCount.HasValue && queryCount < maxItemCount)
            {
                return queryCount.Value;
            }

            return maxItemCount;
        }
    }
}
