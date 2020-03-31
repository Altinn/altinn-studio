namespace Altinn.Platform.Storage.Repository
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Net;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Configuration;
    using Altinn.Platform.Storage.Interface.Models;
    using Microsoft.Azure.Documents;
    using Microsoft.Azure.Documents.Client;
    using Microsoft.Azure.Documents.Linq;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;
    using Newtonsoft.Json;

    /// <summary>
    /// Handles text repository.
    /// </summary>
    public class TextRepository : ITextRepository
    {
        private readonly Uri databaseUri;
        private readonly Uri _collectionUri;
        private readonly string databaseId;
        private readonly string collectionId = "texts";
        private readonly string partitionKey = "/org";
        private static DocumentClient _client;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        /// <param name="logger">dependency injection of logger</param>
        public TextRepository(IOptions<AzureCosmosSettings> cosmosettings, ILogger<ApplicationRepository> logger)
        {
            _logger = logger;

            var database = new CosmosDatabaseHandler(cosmosettings.Value);

            _client = database.CreateDatabaseAndCollection(collectionId);
            _collectionUri = database.CollectionUri;
            databaseUri = database.DatabaseUri;
            databaseId = database.DatabaseName;

            DocumentCollection documentCollection = database.CreateDocumentCollection(collectionId, partitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _client.OpenAsync();
        }

        public async Task<TextResource> Get(string org, string app, string language)
        {
            try
            {
                string id = GetTextId(org, app, language);
                Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, id);
                TextResource result = await _client
                    .ReadDocumentAsync<TextResource>(
                        uri,
                        new RequestOptions { PartitionKey = new PartitionKey(org) });
                return result;
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    return null;
                }

                throw dce;
            }
        }

        public async Task<TextResource> Create(string org, string app, TextResource textResource)
        {
            PreProcess(org, app, textResource);
            ResourceResponse<Document> document = await _client.CreateDocumentAsync(_collectionUri, textResource);
            TextResource result = JsonConvert.DeserializeObject<TextResource>(document.Resource.ToString());
            return result;
        }

        public async Task<TextResource> Update(string org, string app, string language, TextResource textResource)
        {
            PreProcess(org, app, textResource);
            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, textResource.Id);

            ResourceResponse<Document> document = await _client
                .ReplaceDocumentAsync(
                    uri,
                    textResource,
                    new RequestOptions { PartitionKey = new PartitionKey(org) });

            TextResource updatedResource = JsonConvert.DeserializeObject<TextResource>(document.Resource.ToString());
            return updatedResource;
        }

        public async Task<bool> Delete(string org, string app, string language)
        {
            string id = GetTextId(org, app, language);
            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, id);

            ResourceResponse<Document> instance = await _client
                .DeleteDocumentAsync(
                    uri.ToString(),
                    new RequestOptions { PartitionKey = new PartitionKey(org) });

            return true;
        }

        private string GetTextId(string org, string app, string language)
        {
            return $"{org}-{app}-{language}";
        }

        /// <summary>
        /// Pre processes the text resource. Creates id and adds partition key org
        /// </summary>
        private void PreProcess(string org, string app, TextResource textResource)
        {
            textResource.Id = GetTextId(org, app, textResource.Language);
            textResource.Org = org;
        }
    }
}
