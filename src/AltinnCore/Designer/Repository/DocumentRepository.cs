using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.ViewModels.Request;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Repository
{
    /// <summary>
    /// Implementation of IDocumentRepository
    /// </summary>
    public abstract class DocumentRepository : IDocumentRepository
    {
        private readonly IDocumentClient _documentClient;
        private readonly string _collection;
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
            _database = options.Value.Database;
            _documentClient = documentClient;
            _collectionUri = UriFactory.CreateDocumentCollectionUri(_database, _collection);

            DocumentCollection documentCollection = new DocumentCollection
            {
                Id = collectionName
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
            return await _documentClient.ReadDocumentAsync<T>(documentUri);
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<T>> GetWithSqlAsync<T>(SqlQuerySpec sqlQuerySpec)
            where T : BaseEntity
        {
            IDocumentQuery<T> documentQuery = _documentClient
                .CreateDocumentQuery<T>(_collectionUri, sqlQuerySpec)
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
