using System;
using System.Collections.Generic;
using System.Net;
using System.Text;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Repository
{
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
            QueryRequestOptions options = new QueryRequestOptions() { MaxBufferedItemCount = 0, MaxConcurrency = -1 };
            FeedIterator<Application> query = Container.GetItemLinqQueryable<Application>(requestOptions: options).ToFeedIterator();

            return await GetMatchesAsync(query);
        }

        /// <inheritdoc/>
        public async Task<List<Application>> FindByOrg(string org)
        {
            QueryRequestOptions options = new QueryRequestOptions() { MaxBufferedItemCount = 0, MaxConcurrency = -1, PartitionKey = new(org) };
            FeedIterator<Application> query = Container.GetItemLinqQueryable<Application>(requestOptions: options)
                    .ToFeedIterator();

            return await GetMatchesAsync(query);
        }

        /// <inheritdoc/>
        public async Task<Application> FindOne(string appId, string org)
        {
            string cosmosAppId = AppIdToCosmosId(appId);

            if (!_memoryCache.TryGetValue(appId, out Application application))
            {
                try
                {
                    application = await Container.ReadItemAsync<Application>(cosmosAppId, new PartitionKey(org));
                }
                catch (CosmosException e)
                {
                    if (e.StatusCode == HttpStatusCode.NotFound)
                    {
                        return null;
                    }

                    throw;
                }

                PostProcess(application);

                if (application.Id.Split("/").Length == 2)
                {
                    _memoryCache.Set(appId, application, _cacheEntryOptionsMetadata);
                }
            }

            return application;
        }

        /// <inheritdoc/>
        public async Task<Application> Create(Application item)
        {
            item.Id = AppIdToCosmosId(item.Id);

            ItemResponse<Application> createdApplication = await Container.CreateItemAsync(item, new PartitionKey(item.Org));

            PostProcess(createdApplication);

            return createdApplication;
        }

        /// <inheritdoc/>
        public async Task<Application> Update(Application cachedApplication)
        {
            Application item = DeepClone(cachedApplication);

            PreProcess(item);

            Application upsertedApplication = await Container.UpsertItemAsync(item, new PartitionKey(cachedApplication.Org));

            PostProcess(upsertedApplication);

            return upsertedApplication;
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(string appId, string org)
        {
            string cosmosAppId = AppIdToCosmosId(appId);

            ItemResponse<Application> response = await Container.DeleteItemAsync<Application>(cosmosAppId, new PartitionKey(org));

            return response.StatusCode == HttpStatusCode.NoContent;
        }

        /// <inheritdoc/>
        public async Task<Dictionary<string, string>> GetAllAppTitles()
        {
            if (!_memoryCache.TryGetValue(_cacheKey, out Dictionary<string, string> appTitles))
            {
                appTitles = new Dictionary<string, string>();

                QueryRequestOptions options = new QueryRequestOptions() { MaxBufferedItemCount = 0, MaxConcurrency = -1 };
                FeedIterator<Application> query = Container.GetItemLinqQueryable<Application>(requestOptions: options)
                        .ToFeedIterator();

                while (query.HasMoreResults)
                {
                    foreach (Application item in await query.ReadNextAsync())
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

        private static async Task<List<Application>> GetMatchesAsync(FeedIterator<Application> query)
        {
            List<Application> applications = new List<Application>();

            while (query.HasMoreResults)
            {
                FeedResponse<Application> response = await query.ReadNextAsync();
                applications.AddRange(response);
            }

            query.Dispose();

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

            if (appId != null && appId.Contains('/'))
            {
                string[] parts = appId.Split('/');

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

        private static Application DeepClone(Application item)
        {
            string application = JsonConvert.SerializeObject(item, Formatting.Indented);

            return JsonConvert.DeserializeObject<Application>(application);
        }
    }
}
