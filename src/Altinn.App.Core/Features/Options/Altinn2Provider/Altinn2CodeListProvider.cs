using Altinn.App.Core.Models;
using Microsoft.Extensions.Caching.Memory;

namespace Altinn.App.Core.Features.Options.Altinn2Provider;

/// <summary>
/// Implementation of a IAppOptionsProviders for the old altinn2 apis
/// </summary>
public class Altinn2CodeListProvider : IAppOptionsProvider
{
    /// <summary>
    /// Mapping function to get from the altinn2 model to altinn 3 option
    /// </summary>
    private readonly Func<MetadataCodeListCodes, AppOption> _transform;

    /// <summary>
    /// Filter function in case you only want a subset of the altinn2 codelist
    /// </summary>
    private readonly Func<MetadataCodeListCodes, bool>? _filter;

    /// <summary>
    /// id for use in altinn2 api
    /// </summary>
    private readonly string _metadataApiId;

    /// <summary>
    /// version of the code list in the altinn2 metadata api
    /// </summary>
    private readonly int? _codeListVersion;

    /// <summary>
    /// Altinn2MetadataApiClient for requesting
    /// </summary>
    private readonly Altinn2MetadataApiClient _client;

    /// <summary>
    /// Cache for options as altinn2 options are static
    /// </summary>
    private readonly IMemoryCache _cache;

    /// <inheritdoc />
    public string Id { get; private set; }

    /// <summary>
    /// <see cref="CommonOptionProviderServiceCollectionExtensions.AddAltinn2CodeList" />
    /// </summary>
    public Altinn2CodeListProvider(
        IMemoryCache cache,
        Altinn2MetadataApiClient client,
        string id,
        Func<MetadataCodeListCodes, AppOption> transform,
        Func<MetadataCodeListCodes, bool>? filter,
        string? metadataApiId = null,
        int? codeListVersion = null
    )
    {
        _cache = cache;
        _client = client;
        Id = id; // id in layout definitions
        _metadataApiId = metadataApiId ?? id; // codelist id in api (often the same as id, but if the same codelist is used with different filters, it has to be different)
        _transform = transform;
        _filter = filter;
        _codeListVersion = codeListVersion;
    }

    /// <summary>
    /// Utility method if you need the raw codelist for dataprocessinghandler
    /// </summary>
    public async Task<MetadataCodelistResponse> GetRawAltinn2CodelistAsync(string? language)
    {
        var langCode = language switch
        {
            "nb" => "1044",
            "nn" => "2068",
            "en" => "1033",
            _ => "1044", // default to norwegian bokmål
        };

        // ! TODO: address this is next major release, should never return null
        return (
            await _cache.GetOrCreateAsync(
                $"{_metadataApiId}{langCode}{_codeListVersion}",
                async (entry) =>
                {
                    entry.Priority = CacheItemPriority.NeverRemove;
                    entry.AbsoluteExpiration = DateTimeOffset.MaxValue;
                    return await _client.GetAltinn2Codelist(_metadataApiId, langCode, _codeListVersion);
                }
            )
        )!;
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        var codelist = await GetRawAltinn2CodelistAsync(language);

        AppOptions options = new()
        {
            Options = codelist.Codes.Where(_filter ?? (c => true)).Select(_transform).ToList(),
            IsCacheable = true,
        };
        return options;
    }
}
