using System.Net.Http.Headers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Texts;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

/// <summary>
/// A client for retrieving text resources from Altinn Platform.
/// </summary>
[Obsolete("Use IAppResources.GetTexts() instead")]
public class TextClient : IText
{
    private readonly ILogger _logger;
    private readonly AppSettings _settings;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly HttpClient _client;
    private readonly IMemoryCache _memoryCache;
    private readonly MemoryCacheEntryOptions _cacheEntryOptions;

    /// <summary>
    /// Initializes a new instance of the <see cref="TextClient"/> class.
    /// </summary>
    /// <param name="settings">The app repository settings.</param>
    /// <param name="platformSettings">The platform settings object from configuration.</param>
    /// <param name="logger">A logger from the built in logger factory.</param>
    /// <param name="httpContextAccessor">An object with access to the http context.</param>
    /// <param name="httpClient">A HttpClient provided by the built in HttpClientFactory.</param>
    /// <param name="memoryCache">The built in MemoryCache.</param>
    public TextClient(
        IOptions<AppSettings> settings,
        IOptions<PlatformSettings> platformSettings,
        ILogger<TextClient> logger,
        IHttpContextAccessor httpContextAccessor,
        HttpClient httpClient,
        IMemoryCache memoryCache
    )
    {
        _settings = settings.Value;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;

        _memoryCache = memoryCache;
        _cacheEntryOptions = new MemoryCacheEntryOptions()
            .SetPriority(CacheItemPriority.High)
            .SetAbsoluteExpiration(new TimeSpan(0, 0, settings.Value.CacheResourceLifeTimeInSeconds));
    }

    /// <inheritdoc />
    public async Task<TextResource?> GetText(string org, string app, string language)
    {
        TextResource? textResource = null;
        string cacheKey = $"{org}-{app}-{language.ToLowerInvariant()}";

        if (!_memoryCache.TryGetValue(cacheKey, out textResource))
        {
            // Key not in cache, so get text from Platform Storage
            string url = $"applications/{org}/{app}/texts/{language}";
            string token = JwtTokenUtil.GetTokenFromContext(
                _httpContextAccessor.HttpContext,
                _settings.RuntimeCookieName
            );

            HttpResponseMessage response = await _client.GetAsync(token, url);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                textResource = await JsonSerializerPermissive.DeserializeAsync<TextResource>(response.Content);
                _memoryCache.Set(cacheKey, textResource, _cacheEntryOptions);
            }
            else
            {
                _logger.LogError(
                    $"Getting text resource for {org}/{app} with language code: {language} failed with statuscode {response.StatusCode}"
                );
            }
        }

        return textResource;
    }
}
