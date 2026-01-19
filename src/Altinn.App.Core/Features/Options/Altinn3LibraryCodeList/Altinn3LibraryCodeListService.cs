using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Caching.Hybrid;

namespace Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;

/// <summary>
/// Service for handling Altinn 3 library code lists.
/// </summary>
internal sealed class Altinn3LibraryCodeListService : IAltinn3LibraryCodeListService
{
    private readonly HybridCache _hybridCache;
    private readonly IAltinn3LibraryCodeListApiClient _altinn3LibraryCodeListApiClient;
    private readonly Telemetry? _telemetry;

    private static readonly HybridCacheEntryOptions _defaultCacheExpiration = new()
    {
        Expiration = TimeSpan.FromMinutes(15),
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="Altinn3LibraryCodeListService"/> class.
    /// </summary>
    public Altinn3LibraryCodeListService(
        HybridCache hybridCache,
        IAltinn3LibraryCodeListApiClient altinn3LibraryCodeListApiClient,
        Telemetry? telemetry = null
    )
    {
        _hybridCache = hybridCache;
        _altinn3LibraryCodeListApiClient = altinn3LibraryCodeListApiClient;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(
        string org,
        string codeListId,
        string version,
        string? language,
        CancellationToken cancellationToken
    )
    {
        using var telemetry = _telemetry?.StartGetOptionsActivity();
        var response = await GetCachedCodeListResponseAsync(org, codeListId, version, cancellationToken);
        return MapAppOptions(response, language);
    }

    /// <inheritdoc/>
    public async Task<Altinn3LibraryCodeListResponse> GetCachedCodeListResponseAsync(
        string org,
        string codeListId,
        string? version,
        CancellationToken cancellationToken = default
    )
    {
        version = GetLatestVersion(version);
        var result = await _hybridCache.GetOrCreateAsync(
            $"Altinn3Library:{org}:{codeListId}:{version}",
            async cancel =>
                await _altinn3LibraryCodeListApiClient.GetAltinn3LibraryCodeList(org, codeListId, version, cancel),
            options: _defaultCacheExpiration,
            cancellationToken: cancellationToken
        );

        return result;
    }

    /// <inheritdoc/>
    public AppOptions MapAppOptions(Altinn3LibraryCodeListResponse libraryCodeListResponse, string? language)
    {
        var options = libraryCodeListResponse
            .Codes.Select(code =>
            {
                var tagDict = MapTags(libraryCodeListResponse, code);

                return new AppOption
                {
                    Value = code.Value,
                    Label = GetValueWithLanguageFallback(code.Label, language),
                    Description = GetValueWithLanguageFallback(code.Description, language),
                    HelpText = GetValueWithLanguageFallback(code.HelpText, language),
                    Tags = tagDict,
                };
            })
            .ToList();

        return new AppOptions
        {
            IsCacheable = true,
            Options = options,
            Parameters = new Dictionary<string, string?>
            {
                { "version", libraryCodeListResponse.Version },
                { "source", libraryCodeListResponse.Source.Name },
            },
        };
    }

    private static Dictionary<string, string>? MapTags(
        Altinn3LibraryCodeListResponse libraryCodeListResponse,
        Altinn3LibraryCodeListItem code
    )
    {
        Dictionary<string, string>? tagDict = null;
        if (
            code.Tags is not null
            && libraryCodeListResponse.TagNames is not null
            && code.Tags.Count == libraryCodeListResponse.TagNames.Count
        )
        {
            tagDict = new Dictionary<string, string>();
            foreach (var (k, index) in libraryCodeListResponse.TagNames.Select((k, i) => (k, i)))
            {
                if (!tagDict.ContainsKey(k))
                {
                    tagDict[k] = code.Tags[index];
                }
            }
        }

        return tagDict;
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
            || languageCollection.TryGetValue(LanguageConst.Nn, out value)
            || languageCollection.TryGetValue(LanguageConst.En, out value)
        )
        {
            return value;
        }

        return languageCollection.OrderBy(x => x.Key).First().Value;
    }

    private static string GetLatestVersion(string? version)
    {
        return string.IsNullOrEmpty(version) || version.Equals("latest", StringComparison.OrdinalIgnoreCase)
            ? "_latest"
            : version;
    }
}
