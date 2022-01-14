namespace Altinn.Platform.Storage.Repository
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    using Altinn.Platform.Storage.Configuration;
    using Altinn.Platform.Storage.Interface.Models;

    using Microsoft.Azure.Documents;
    using Microsoft.Azure.Documents.Client;
    using Microsoft.Azure.Documents.Linq;
    using Microsoft.Extensions.Caching.Memory;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;

    using Newtonsoft.Json;

    /// <summary>
    /// Handles applicationMetadata repository. Notice that the all methods should modify the Id attribute of the
    /// Application, since cosmosDb fails if Id contains slashes '/'.
    /// </summary>
    internal sealed class ApplicationRepository : BaseRepository, IApplicationRepository
    {
        private const string CollectionId = "applications";
        private const string PartitionKey = "/org";

        private readonly ILogger _logger;
        private readonly IMemoryCache _memoryCache;
        private readonly MemoryCacheEntryOptions _cacheEntryOptionsTitles;
        private readonly MemoryCacheEntryOptions _cacheEntryOptionsMetadata;
        private readonly string _cacheKey = "allAppTitles";

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationRepository"/> class.
        /// </summary>
        /// <param name="cosmosSettings">the configuration settings for cosmos database</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">dependency injection of logger</param>
        /// <param name="memoryCache">the memory cache</param>
        public ApplicationRepository(
            IOptions<AzureCosmosSettings> cosmosSettings,
            IOptions<GeneralSettings> generalSettings,
            ILogger<ApplicationRepository> logger,
            IMemoryCache memoryCache)
            : base(CollectionId, PartitionKey, cosmosSettings)
        {
            _logger = logger;

            _memoryCache = memoryCache;
            _cacheEntryOptionsTitles = new MemoryCacheEntryOptions()
                .SetPriority(CacheItemPriority.High)
                .SetAbsoluteExpiration(new TimeSpan(0, 0, generalSettings.Value.AppTitleCacheLifeTimeInSeconds));
            _cacheEntryOptionsMetadata = new MemoryCacheEntryOptions()
              .SetPriority(CacheItemPriority.High)
              .SetAbsoluteExpiration(new TimeSpan(0, 0, generalSettings.Value.AppMetadataCacheLifeTimeInSeconds));
        }

        /// <inheritdoc/>
        public async Task<List<Application>> FindAll()
        {
            IDocumentQuery<Application> query = Client
                .CreateDocumentQuery<Application>(CollectionUri, new FeedOptions { EnableCrossPartitionQuery = true })
                .AsDocumentQuery();

            return await GetMatchesAsync(query);
        }

        /// <inheritdoc/>
        public async Task<List<Application>> FindByOrg(string org)
        {
            IDocumentQuery<Application> query = Client
                .CreateDocumentQuery<Application>(CollectionUri, new FeedOptions { EnableCrossPartitionQuery = true })
                .Where(i => i.Org == org)
                .AsDocumentQuery();

            return await GetMatchesAsync(query);
        }

        /// <inheritdoc/>
        public async Task<Application> FindOne(string appId, string org)
        {
            string cosmosAppId = AppIdToCosmosId(appId);
            Uri uri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, cosmosAppId);

            if (!_memoryCache.TryGetValue(appId, out Application application))
            {
                application = await Client
                .ReadDocumentAsync<Application>(
                    uri,
                    new RequestOptions { PartitionKey = new PartitionKey(org) });
                PostProcess(application);
            }

            _memoryCache.Set(appId, application, _cacheEntryOptionsMetadata);
            return application;
        }

        /// <inheritdoc/>
        public async Task<Application> Create(Application item)
        {
            item.Id = AppIdToCosmosId(item.Id);

            ResourceResponse<Document> createDocumentResponse = await Client.CreateDocumentAsync(CollectionUri, item);
            Document document = createDocumentResponse.Resource;

            Application instance = JsonConvert.DeserializeObject<Application>(document.ToString());

            PostProcess(instance);

            return instance;
        }

        /// <inheritdoc/>
        public async Task<Application> Update(Application item)
        {
            PreProcess(item);

            Uri uri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, item.Id);

            ResourceResponse<Document> document = await Client
                .ReplaceDocumentAsync(
                    uri,
                    item,
                    new RequestOptions { PartitionKey = new PartitionKey(item.Org) });

            string storedApplication = document.Resource.ToString();

            Application application = JsonConvert.DeserializeObject<Application>(storedApplication);

            PostProcess(application);

            return application;
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(string appId, string org)
        {
            string cosmosAppId = AppIdToCosmosId(appId);

            Uri uri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, cosmosAppId);

            ResourceResponse<Document> instance = await Client
                .DeleteDocumentAsync(
                    uri.ToString(),
                    new RequestOptions { PartitionKey = new PartitionKey(org) });

            return true;
        }

        /// <inheritdoc/>
        public async Task<Dictionary<string, string>> GetAllAppTitles()
        {
            Dictionary<string, string> appTitles;

            if (!_memoryCache.TryGetValue(_cacheKey, out appTitles))
            {
                appTitles = new Dictionary<string, string>();
                IDocumentQuery<Application> query = Client.CreateDocumentQuery<Application>(CollectionUri).AsDocumentQuery();

                while (query.HasMoreResults)
                {
                    FeedResponse<Application> result = await query.ExecuteNextAsync<Application>();
                    foreach (Application item in result)
                    {
                        StringBuilder titles = new StringBuilder();
                        foreach (string title in item.Title.Values)
                        {
                            titles.Append(title + ";");
                        }

                        appTitles.Add(CosmosIdToAppId(item.Id), titles.ToString());
                    }
                }

                _memoryCache.Set(_cacheKey, appTitles, _cacheEntryOptionsTitles);
            }

            return appTitles;
        }

        private async Task<List<Application>> GetMatchesAsync(IDocumentQuery<Application> query)
        {
            List<Application> applications = new List<Application>();

            while (query.HasMoreResults)
            {
                FeedResponse<Application> result = await query.ExecuteNextAsync<Application>();
                applications.AddRange(result.ToList());
            }

            PostProcess(applications);

            return applications;
        }

        /// <summary>
        /// Converts the appId "{org}/{app}" to "{org}-{app}"
        /// </summary>
        /// <param name="appId">the id to convert</param>
        /// <returns>the converted id</returns>
        private static string AppIdToCosmosId(string appId)
        {
            string cosmosId = appId;

            if (appId != null && appId.Contains("/"))
            {
                string[] parts = appId.Split("/");

                cosmosId = $"{parts[0]}-{parts[1]}";
            }

            return cosmosId;
        }

        /// <summary>
        /// Converts the cosmosId "{org}-{app}" to "{org}/{app}"
        /// </summary>
        /// <param name="cosmosId">the id to convert</param>
        /// <returns>the converted id</returns>
        private static string CosmosIdToAppId(string cosmosId)
        {
            string appId = cosmosId;

            int firstDash = cosmosId.IndexOf("-");

            if (firstDash > 0)
            {
                string app = cosmosId.Substring(firstDash + 1);
                string org = cosmosId.Split("-")[0];

                appId = $"{org}/{app}";
            }

            return appId;
        }

        /// <summary>
        /// fix appId so that cosmos can store it: org/app-23 -> org-app-23
        /// </summary>
        /// <param name="application">the application to preprocess</param>
        private static void PreProcess(Application application)
        {
            application.Id = AppIdToCosmosId(application.Id);
        }

        /// <summary>
        /// postprocess applications so that appId becomes org/app-23 to use outside cosmos
        /// </summary>
        /// <param name="application">the application to postprocess</param>
        private static void PostProcess(Application application)
        {
            application.Id = CosmosIdToAppId(application.Id);
        }

        private static void PostProcess(List<Application> applications)
        {
            applications.ForEach(a => PostProcess(a));
        }
    }
}
