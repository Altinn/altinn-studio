using System.Diagnostics.CodeAnalysis;
using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Options.Altinn3LibraryProvider;

internal class Altinn3LibraryOptionsProvider : IAppOptionsProvider
{
    private readonly HybridCache _hybridCache;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<Altinn3LibraryOptionsProvider> _logger;
    private readonly PlatformSettings _platformSettings;

    private static readonly HybridCacheEntryOptions _defaultCacheExpiration = new()
    {
        Expiration = TimeSpan.FromMinutes(15),
    };

    public Altinn3LibraryOptionsProvider(
        string optionId,
        string org,
        string codeListId,
        string? version,
        HybridCache hybridCache,
        IHttpClientFactory httpClientFactory,
        ILogger<Altinn3LibraryOptionsProvider> logger,
        IOptions<PlatformSettings> platformSettings
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(optionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(org);
        ArgumentException.ThrowIfNullOrWhiteSpace(codeListId);

        _httpClientFactory = httpClientFactory;
        Id = optionId;
        _org = org;
        _codeListId = codeListId;
        _version = !string.IsNullOrEmpty(version) ? version : "latest";
        _hybridCache = hybridCache;
        _logger = logger;
        _platformSettings = platformSettings.Value;
    }

    public string Id { get; }
    private readonly string _org;
    private readonly string _codeListId;
    private readonly string _version;

    public async Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        var result = await _hybridCache.GetOrCreateAsync(
            $"Altinn3Library:{_org}-{_codeListId}-{_version}",
            async cancel => await GetAppOptions(cancellationToken: cancel),
            options: _defaultCacheExpiration
        );
        return MapAppOptions(result, language);
    }

    private static AppOptions MapAppOptions(Altinn3LibraryCodeListResponse codeListResponse, string? language)
    {
        var options = codeListResponse
            .Codes.Select(code => new AppOption
            {
                Value = code.Value,
                Label = GetValueWithLanguageFallback(code.Label, language),
                Description = GetValueWithLanguageFallback(code.Description, language),
                HelpText = GetValueWithLanguageFallback(code.HelpText, language),
            })
            .ToList();

        return new AppOptions
        {
            IsCacheable = true,
            Options = options,
            Parameters = new Dictionary<string, string?>
            {
                { "version", codeListResponse.Version },
                { "source", codeListResponse.Source.Name },
            },
        };
    }

    /// <summary>
    /// Gets a value from a language collection with fallback logic.
    /// Attempts to find a value in this order: requested language, Nb, En, then first available (alphabetically by key).
    /// </summary>
    [return: NotNullIfNotNull(nameof(languageCollection))]
    private static string? GetValueWithLanguageFallback(
        Dictionary<string, string>? languageCollection,
        string? language
    )
    {
        if (languageCollection == null)
        {
            return null;
        }
        if (languageCollection.Count == 0)
        {
            return string.Empty;
        }
        if (
            language != null && languageCollection.TryGetValue(language, out var value)
            || languageCollection.TryGetValue(LanguageConst.Nb, out value)
            || languageCollection.TryGetValue(LanguageConst.En, out value)
        )
        {
            return value;
        }

        return languageCollection.OrderBy(x => x.Key).First().Value;
    }

    private async Task<Altinn3LibraryCodeListResponse> GetAppOptions(CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = _httpClientFactory.CreateClient("Altinn3LibraryClient");
            httpClient.BaseAddress = new Uri(_platformSettings.Altinn3LibraryApiEndpoint);
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var response = await httpClient.GetAsync(
                $"{_org}/code_lists/{_codeListId}/{_version}.json",
                cancellationToken
            );
            if (response.StatusCode != HttpStatusCode.OK)
            {
                throw new HttpRequestException("Unexpected response from Altinn3Library");
            }
            return await JsonSerializerPermissive.DeserializeAsync<Altinn3LibraryCodeListResponse>(
                response.Content,
                cancellationToken
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Exception thrown in GetAppOptions. Code list id: {CodeListId}, Version: {Version}, Org: {Org}",
                _codeListId,
                _version,
                _org
            );
            throw;
        }
    }
}
