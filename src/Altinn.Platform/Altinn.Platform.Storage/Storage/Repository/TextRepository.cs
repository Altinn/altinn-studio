namespace Altinn.Platform.Storage.Repository
{
    using System;
    using System.Net;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Configuration;
    using Altinn.Platform.Storage.Helpers;
    using Altinn.Platform.Storage.Interface.Models;
    using Microsoft.Azure.Documents;
    using Microsoft.Azure.Documents.Client;
    using Microsoft.Extensions.Options;
    using Newtonsoft.Json;

    /// <summary>
    /// Handles text repository.
    /// </summary>
    public class TextRepository : ITextRepository
    {
        private readonly Uri _collectionUri;
        private readonly string _databaseId;
        private readonly string _collectionId = "texts";
        private readonly string _partitionKey = "/org";
        private readonly DocumentClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public TextRepository(IOptions<AzureCosmosSettings> cosmosettings)
        {
            var database = new CosmosDatabaseHandler(cosmosettings.Value);

            _client = database.CreateDatabaseAndCollection(_collectionId);
            _collectionUri = database.CollectionUri;
            _databaseId = database.DatabaseName;

            DocumentCollection documentCollection = database.CreateDocumentCollection(_collectionId, _partitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                database.DatabaseUri,
                documentCollection).GetAwaiter().GetResult();

            _client.OpenAsync();
        }

        /// <inheritdoc/>
        public async Task<TextResource> Get(string org, string app, string language)
        {
            ValidateArguments(org, app, language);
            try
            {
                string id = GetTextId(org, app, language);
                Uri uri = UriFactory.CreateDocumentUri(_databaseId, _collectionId, id);
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

                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<TextResource> Create(string org, string app, TextResource textResource)
        {
            string language = textResource.Language;
            ValidateArguments(org, app, language);
            PreProcess(org, app, language, textResource);
            ResourceResponse<Document> document = await _client.CreateDocumentAsync(_collectionUri, textResource);
            TextResource result = JsonConvert.DeserializeObject<TextResource>(document.Resource.ToString());
            return result;
        }

        /// <inheritdoc/>
        public async Task<TextResource> Update(string org, string app, TextResource textResource)
        {
            string language = textResource.Language;
            ValidateArguments(org, app, language);
            PreProcess(org, app, language, textResource);
            Uri uri = UriFactory.CreateDocumentUri(_databaseId, _collectionId, textResource.Id);

            ResourceResponse<Document> document = await _client
                .ReplaceDocumentAsync(
                    uri,
                    textResource,
                    new RequestOptions { PartitionKey = new PartitionKey(org) });

            TextResource updatedResource = JsonConvert.DeserializeObject<TextResource>(document.Resource.ToString());
            return updatedResource;
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(string org, string app, string language)
        {
            ValidateArguments(org, app, language);
            string id = GetTextId(org, app, language);
            Uri uri = UriFactory.CreateDocumentUri(_databaseId, _collectionId, id);

            await _client
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
        private void PreProcess(string org, string app, string language, TextResource textResource)
        {
            textResource.Id = GetTextId(org, app, language);
            textResource.Org = org;
        }

        /// <summary>
        /// Validates that org and app are not null, checks that language is two letter ISO string
        /// </summary>
        private void ValidateArguments(string org, string app, string language)
        {
            if (string.IsNullOrEmpty(org))
            {
                throw new ArgumentException("Org can not be null or empty");
            }

            if (string.IsNullOrEmpty(app))
            {
                throw new ArgumentException("App can not be null or empty");
            }

            if (!LanguageHelper.IsTwoLetters(language))
            {
                throw new ArgumentException("Language must be a two letter ISO name");
            }
        }
    }
}
