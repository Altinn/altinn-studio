using System.Text.Json.Serialization;
using Altinn.Studio.Admin.Configuration;
using Altinn.Studio.Admin.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Admin.Services;

/// <summary>
/// Implementation of the cdn config service.
/// </summary>
public class CdnConfigService : ICdnConfigService
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(15);
    private readonly GeneralSettings _generalSettings;

    /// <summary>
    /// Initializes a new instance of the <see cref="CdnConfigService"/> class.
    /// </summary>
    /// <param name="httpClient">The HTTP client used for making requests.</param>
    /// <param name="cache">The memory cache for storing configuration data.</param>
    /// <param name="generalSettings">Options containing general settings, including CDN configurations.</param>
    public CdnConfigService(
        HttpClient httpClient,
        IMemoryCache cache,
        IOptions<GeneralSettings> generalSettings
    )
    {
        _httpClient = httpClient;
        _cache = cache;
        _generalSettings = generalSettings.Value;
    }

    /// <inheritdoc />
    public async Task<List<string>> GetOrgEnvironments(string org)
    {
        var orgsConfig = await GetOrgsConfig();

        if (!orgsConfig.Orgs.TryGetValue(org, out var orgConfig))
        {
            throw new KeyNotFoundException($"Organization '{org}' not found.");
        }

        return orgConfig.Environments;
    }

    /// <inheritdoc />
    public async Task<string> GetPlatformBaseUrl(string env)
    {
        var environmentsConfig = await GetEnvironmentsConfig();

        var environmentConfig = environmentsConfig.Environments.FirstOrDefault(e => e.Name == env);
        if (environmentConfig == null)
        {
            throw new KeyNotFoundException($"Environment '{env}' not found.");
        }

        return environmentConfig.PlatformUrl;
    }

    /// <inheritdoc />
    public async Task<string> GetAppsBaseUrl(string org, string env)
    {
        var environmentsConfig = await GetEnvironmentsConfig();

        var environmentConfig = environmentsConfig.Environments.FirstOrDefault(e => e.Name == env);
        if (environmentConfig == null)
        {
            throw new KeyNotFoundException($"Environment '{env}' not found.");
        }

        return $"https://{org}.{environmentConfig.AppPrefix}.{environmentConfig.Hostname}";
    }

    /// <inheritdoc />
    public async Task<IEnumerable<string>> GetSortedEnvironmentNames()
    {
        var environmentsConfig = await GetEnvironmentsConfig();

        return environmentsConfig
            .Environments.OrderBy(e => e.Type, StringComparer.Ordinal)
            .ThenBy(e => e.Name, StringComparer.Ordinal)
            .Select(e => e.Name);
    }

    private async Task<CdnOrgs> GetOrgsConfig()
    {
        var config = await _cache.GetOrCreateAsync(
            "CdnConfigService:OrgsConfig",
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = _cacheDuration;
                var response = await _httpClient.GetAsync(_generalSettings.OrganizationsUrl);
                response.EnsureSuccessStatusCode();
                var config = await response.Content.ReadFromJsonAsync<CdnOrgs>();

                if (config == null)
                {
                    throw new InvalidOperationException(
                        "Failed to deserialize response content or content was empty."
                    );
                }
                return config;
            }
        );

        if (config == null)
        {
            throw new InvalidOperationException("Cache returned null unexpectedly.");
        }

        return config!;
    }

    private async Task<CdnEnvironments> GetEnvironmentsConfig()
    {
        var config = await _cache.GetOrCreateAsync(
            "CdnConfigService:EnvironmentsConfig",
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = _cacheDuration;
                var response = await _httpClient.GetAsync(_generalSettings.EnvironmentsUrl);
                response.EnsureSuccessStatusCode();
                var config = await response.Content.ReadFromJsonAsync<CdnEnvironments>();

                if (config == null)
                {
                    throw new InvalidOperationException(
                        "Failed to deserialize response content or content was empty."
                    );
                }
                return config;
            }
        );

        if (config == null)
        {
            throw new InvalidOperationException("Cache returned null unexpectedly.");
        }

        return config!;
    }

    private class CdnOrgs
    {
        [JsonPropertyName("orgs")]
        public required Dictionary<string, CdnOrg> Orgs { get; set; }

        public class CdnOrg
        {
            [JsonPropertyName("name")]
            public required Dictionary<string, string> Name { get; set; }

            [JsonPropertyName("logo")]
            public string? Logo { get; set; }

            [JsonPropertyName("orgnr")]
            public required string OrgNr { get; set; }

            [JsonPropertyName("homepage")]
            public required string Homepage { get; set; }

            [JsonPropertyName("environments")]
            public required List<string> Environments { get; set; }
        }
    }

    private class CdnEnvironments
    {
        [JsonPropertyName("environments")]
        public required List<CdnEnv> Environments { get; set; }

        public class CdnEnv
        {
            [JsonPropertyName("name")]
            public required string Name { get; set; }

            [JsonPropertyName("type")]
            public required string Type { get; set; }

            [JsonPropertyName("platformUrl")]
            public required string PlatformUrl { get; set; }

            [JsonPropertyName("hostname")]
            public required string Hostname { get; set; }

            [JsonPropertyName("appPrefix")]
            public required string AppPrefix { get; set; }

            [JsonPropertyName("platformPrefix")]
            public required string PlatformPrefix { get; set; }
        }
    }
}
