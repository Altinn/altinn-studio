#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Options;

namespace Altinn.App.PlatformServices.Options.Altinn2Provider
{
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
        /// Cache for options as altinn2 options are static
        /// </summary>
        private readonly Dictionary<string, AppOptions> _cachedOptions = new();

        /// <inheritdoc />
        public string Id { get;  private set; }

        /// <summary>
        /// <see cref="Altinn.App.PlatformServices.Options.Altinn2Provider.Altinn2CodeListOptionsBuilder.Add(string, Func{MetadataCodeListCodes, AppOption}, Func{MetadataCodeListCodes, bool}?, string?, int?)" />
        /// </summary>
        public Altinn2CodeListProvider(string id, Func<MetadataCodeListCodes, AppOption> transform, Func<MetadataCodeListCodes, bool>? filter, string? metadataApiId = null, int? codeListVersion = null)
        {
            Id = id; // id in layout definitions
            _metadataApiId = metadataApiId ?? id; // codelist id in api (often the same as id, but if the same codelist is used with different filters, it has to be different)
            _transform = transform;
            _filter = filter;
            _codeListVersion = codeListVersion;
        }

        /// <inheritdoc/>
        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            // TODO: consider making sure this only fetches once even if the server has high load
            if (!_cachedOptions.ContainsKey(language))
            {
                var langCode = language switch
                {
                    "nb" => "1044",
                    "nn" => "2068",
                    "en" => "1033",
                    _ => "1044", // default to norwegian bokmål
                };

                // Don't use httpClientFactory, as this will only run once per language per container reboot
                using (var client = new HttpClient())
                {
                    var version = _codeListVersion == null ? string.Empty : $"/{_codeListVersion.Value}";
                    var response = await client.GetAsync($"https://www.altinn.no/api/metadata/codelists/{Id}{version}?language={langCode}");
                    response.EnsureSuccessStatusCode();
                    var codelist = await response.Content.ReadAsAsync<MetadataCodelistResponse>();
                    AppOptions options = new()
                    {
                        Options = codelist.Codes.Where(_filter ?? (c => true)).Select(_transform).ToList(),
                        IsCacheable = true
                    };
                    _cachedOptions[language] = options;
                }
            }

            return _cachedOptions[language];
        }
    }
}
