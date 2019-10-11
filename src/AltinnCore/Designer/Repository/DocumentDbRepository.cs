using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.ViewModels.Request;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.EntityFrameworkCore;
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
            _collectionUri = UriFactory.CreateDocumentCollectionUri(_database, _collection);
        }

        /// <inheritdoc/>
        public async Task<T> CreateAsync<T>(T item)
        {
            Document document = await _documentClient.CreateDocumentAsync(_collectionUri, item);
            T obj = (dynamic) document;
            return obj;
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<T>> GetAsync<T>(DocumentQueryModel query)
            where T : DocumentBase
        {
            var count = FindMaxItemCount(query.Top, 10);
            var feedOptions = new FeedOptions
            {
                MaxItemCount = count
            };
            return await _documentClient
                .CreateDocumentQuery<T>(_collectionUri, feedOptions)
                .BuildQuery(query)
                .ToListAsync();
        }

        /// <inheritdoc/>
        public async Task<T> GetAsync<T>(string id)
            where T : DocumentBase
        {
            var documentUri = UriFactory.CreateDocumentUri(_database, _collection, id);
            return await _documentClient.ReadDocumentAsync<T>(documentUri);
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<T>> GetWithSqlAsync<T>(SqlQuerySpec sqlQuerySpec)
            where T : DocumentBase
        {
            return await _documentClient
                .CreateDocumentQuery<T>(_collectionUri, sqlQuerySpec)
                .ToListAsync();
        }

        /// <inheritdoc/>
        public async Task UpdateAsync<T>(T item)
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
