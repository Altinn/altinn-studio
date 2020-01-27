using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// Implementation of IDocumentRepository
    /// </summary>
    public abstract class DocumentRepository : IDocumentRepository
    {
        private readonly IDocumentClient _documentClient;
        private readonly string _collection;
        private readonly string _partitionKey;
        private readonly string _database;
        private readonly Uri _collectionUri;

        /// <summary>
        /// Constructor
        /// </summary>
        protected DocumentRepository(
            string collectionName,
            IOptions<AzureCosmosDbSettings> options,
            IDocumentClient documentClient)
        {
            _collection = collectionName;
            _partitionKey = options.Value.PartitionKey;
            _database = options.Value.Database;
            _documentClient = documentClient;
            _collectionUri = UriFactory.CreateDocumentCollectionUri(_database, _collection);

            DocumentCollection documentCollection = new DocumentCollection
            {
                Id = collectionName,
                PartitionKey = new PartitionKeyDefinition
                {
                    Paths = new Collection<string> { _partitionKey }
                }
            };
            Uri dbUri = UriFactory.CreateDatabaseUri(_database);
            documentClient
                .CreateDocumentCollectionIfNotExistsAsync(dbUri, documentCollection)
                .GetAwaiter()
                .GetResult();
        }

        /// <inheritdoc/>
        public async Task<T> CreateAsync<T>(T item)
        {
            Document document = await _documentClient.CreateDocumentAsync(_collectionUri, item);
            T obj = (dynamic)document;
            return obj;
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<T>> GetAsync<T>(DocumentQueryModel query)
            where T : BaseEntity
        {
            FeedOptions feedOptions = new FeedOptions
            {
                PartitionKey = new PartitionKey(_partitionKey),
                MaxItemCount = query.Top ?? int.MaxValue
            };

            IDocumentQuery<T> documentQuery = _documentClient
                .CreateDocumentQuery<T>(_collectionUri, feedOptions)
                .BuildQuery(query)
                .AsDocumentQuery();

            FeedResponse<T> response = await documentQuery.ExecuteNextAsync<T>();
            return response.AsEnumerable();
        }

        /// <inheritdoc/>
        public async Task<T> GetAsync<T>(string id)
            where T : BaseEntity
        {
            Uri documentUri = UriFactory.CreateDocumentUri(_database, _collection, id);
            return await _documentClient.ReadDocumentAsync<T>(documentUri, new RequestOptions { PartitionKey = new PartitionKey(_partitionKey) });
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<T>> GetWithSqlAsync<T>(SqlQuerySpec sqlQuerySpec)
            where T : BaseEntity
        {
            FeedOptions feedOptions = new FeedOptions
            {
                PartitionKey = new PartitionKey(_partitionKey)
            };

            IDocumentQuery<T> documentQuery = _documentClient
                .CreateDocumentQuery<T>(_collectionUri, sqlQuerySpec, feedOptions)
                .AsDocumentQuery();

            FeedResponse<T> response = await documentQuery.ExecuteNextAsync<T>();
            return response.ToList().AsEnumerable();
        }

        /// <inheritdoc/>
        public async Task UpdateAsync<T>(T item)
            where T : BaseEntity
        {
            Uri uri = UriFactory.CreateDocumentUri(_database, _collection, item.Id);
            await _documentClient.ReplaceDocumentAsync(uri, item);
        }
    }
}
