namespace Altinn.Platform.Storage.Repository
{
    using System;
    using System.Collections.Generic;
    using System.Net;
    using System.Threading.Tasks;

    using Altinn.Platform.Storage.Configuration;
    using Altinn.Platform.Storage.Helpers;
    using Altinn.Platform.Storage.Interface.Models;

    using Microsoft.Azure.Documents;
    using Microsoft.Azure.Documents.Client;
    using Microsoft.Extensions.Caching.Memory;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;

    using Newtonsoft.Json;

    /// <summary>
    /// Handles text repository.
    /// </summary>
    internal sealed class TextRepository : BaseRepository, ITextRepository
    {
        private const string CollectionId = "texts";
        private const string PartitionKey = "/org";

        private readonly ILogger<ITextRepository> _logger;
        private readonly IMemoryCache _memoryCache;
        private readonly MemoryCacheEntryOptions _cacheEntryOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextRepository"/> class
        /// </summary>
        /// <param name="cosmosSettings">the configuration settings for cosmos database</param>
        /// <param name="generalSettings">the general configurations settings</param>
        /// <param name="logger">the logger</param>
        /// <param name="memoryCache">the memory cache</param>
        public TextRepository(
            IOptions<AzureCosmosSettings> cosmosSettings,
            IOptions<GeneralSettings> generalSettings,
            ILogger<ITextRepository> logger,
            IMemoryCache memoryCache)
            : base(CollectionId, PartitionKey, cosmosSettings)
        {
            _logger = logger;

            _memoryCache = memoryCache;
            _cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetPriority(CacheItemPriority.High)
                .SetAbsoluteExpiration(new TimeSpan(0, 0, generalSettings.Value.TextResourceCacheLifeTimeInSeconds));
        }

        /// <inheritdoc/>
        public async Task<TextResource> Get(string org, string app, string language)
        {
            ValidateArguments(org, app, language);
            string id = GetTextId(org, app, language);
            if (!_memoryCache.TryGetValue(id, out TextResource textResource))
            {
                try
                {
                    Uri uri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, id);
                    textResource = await Client
                        .ReadDocumentAsync<TextResource>(
                            uri,
                            new RequestOptions { PartitionKey = new PartitionKey(org) });

                    _memoryCache.Set(id, textResource, _cacheEntryOptions);
                    return textResource;
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

            return textResource;
        }

        /// <inheritdoc/>
        public async Task<List<TextResource>> Get(List<string> appIds, string language)
        {
            List<TextResource> result = new List<TextResource>();
            foreach (string appId in appIds)
            {
                string org = appId.Split("/")[0];
                string app = appId.Split("/")[1];

                // Swallowing exceptions, only adding valid text resources as this is used by messagebox
                try
                {
                    TextResource resource = await Get(org, app, language);
                    if (resource != null)
                    {
                        result.Add(resource);
                    }
                }
                catch (Exception e)
                {
                    _logger.LogError($"Error occured when retrieving text resources for {org}-{app} in language {language}. Exception: {e}");
                }
            }

            return result;
        }

        /// <inheritdoc/>
        public async Task<TextResource> Create(string org, string app, TextResource textResource)
        {
            string language = textResource.Language;
            ValidateArguments(org, app, language);
            PreProcess(org, app, language, textResource);
            ResourceResponse<Document> document = await Client.CreateDocumentAsync(CollectionUri, textResource);
            TextResource result = JsonConvert.DeserializeObject<TextResource>(document.Resource.ToString());
            return result;
        }

        /// <inheritdoc/>
        public async Task<TextResource> Update(string org, string app, TextResource textResource)
        {
            string language = textResource.Language;
            ValidateArguments(org, app, language);
            PreProcess(org, app, language, textResource);
            Uri uri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, textResource.Id);

            ResourceResponse<Document> document = await Client
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
            Uri uri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, id);

            await Client
                .DeleteDocumentAsync(
                    uri.ToString(),
                    new RequestOptions { PartitionKey = new PartitionKey(org) });

            return true;
        }

        private static string GetTextId(string org, string app, string language)
        {
            return $"{org}-{app}-{language}";
        }

        /// <summary>
        /// Pre processes the text resource. Creates id and adds partition key org
        /// </summary>
        private static void PreProcess(string org, string app, string language, TextResource textResource)
        {
            textResource.Id = GetTextId(org, app, language);
            textResource.Org = org;
        }

        /// <summary>
        /// Validates that org and app are not null, checks that language is two letter ISO string
        /// </summary>
        private static void ValidateArguments(string org, string app, string language)
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
