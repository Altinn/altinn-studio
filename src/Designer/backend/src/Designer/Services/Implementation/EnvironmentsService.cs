using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

public class EnvironmentsService : IEnvironmentsService
{
    private readonly HttpClient _httpClient;
    private readonly GeneralSettings _generalSettings;
    private readonly PlatformSettings _platformSettings;
    private readonly IMemoryCache _cache;
    private readonly ILogger<EnvironmentsService> _logger;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromHours(1);

    /// <summary>
    /// Initializes a new instance of the <see cref="EnvironmentsService"/> class.
    /// </summary>
    /// <param name="httpClient">System.Net.Http.HttpClient</param>
    /// <param name="generalSettings">GeneralSettings</param>
    /// <param name="platformSettings">PlatformSettings</param>
    /// <param name="memoryCache">The configured memory cache</param>
    /// <param name="logger">The configured logger</param>
    public EnvironmentsService(
        HttpClient httpClient,
        GeneralSettings generalSettings,
        PlatformSettings platformSettings,
        IMemoryCache memoryCache,
        ILogger<EnvironmentsService> logger
    )
    {
        _generalSettings = generalSettings;
        _platformSettings = platformSettings;
        _httpClient = httpClient;
        _cache = memoryCache;
        _logger = logger;
    }

    public async Task<IEnumerable<EnvironmentModel>> GetOrganizationEnvironments(string org)
    {
        var (orgTask, envTask) = (GetAltinnOrgs(), GetEnvironments());
        await Task.WhenAll(orgTask, envTask);
        var (altinnOrgs, environments) = (orgTask.Result, envTask.Result);

        if (!altinnOrgs.TryGetValue(org, out var altinnOrg))
        {
            throw new KeyNotFoundException($"Organization '{org}' not found.");
        }

        return environments.Where(env => altinnOrg.Environments.Contains(env.Name));
    }

    public async Task<Uri> CreatePlatformUri(string envName)
    {
        var environments = await GetEnvironments();

        var environment = environments.FirstOrDefault(item => item.Name == envName);
        if (environment is null)
        {
            throw new KeyNotFoundException($"Environment '{envName}' not found.");
        }

        return new Uri(environment.PlatformUrl);
    }

    public async Task<Uri> GetAppClusterUri(string org, string envName)
    {
        var environments = await GetEnvironments();

        var environment = environments.FirstOrDefault(item => item.Name == envName);
        if (environment is null)
        {
            throw new KeyNotFoundException($"Environment '{envName}' not found.");
        }

        return new Uri(
            _platformSettings
                .AppClusterUrl.Replace("{org}", org)
                .Replace("{appPrefix}", environment.AppPrefix)
                .Replace("{hostName}", environment.Hostname)
                .Replace("{env}", environment.Name)
        );
    }

    public async Task<string> GetHostNameByEnvName(string envName)
    {
        var environments = await GetEnvironments();

        var environment = environments.FirstOrDefault(item => item.Name == envName);
        if (environment is null)
        {
            throw new KeyNotFoundException($"Environment '{envName}' not found.");
        }

        return environment.Hostname;
    }

    public Task<List<EnvironmentModel>> GetEnvironments()
    {
        return _cache.GetOrCreateAsync(
            "EnvironmentsService:Environments",
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = _cacheDuration;
                var response = await _httpClient.GetAsync(_generalSettings.EnvironmentsUrl);
                response.EnsureSuccessStatusCode();
                var environmentsModel =
                    await response.Content.ReadFromJsonAsync<EnvironmentsModel>();

                if (environmentsModel == null)
                {
                    throw new InvalidOperationException(
                        "Failed to deserialize response content or content was empty."
                    );
                }
                return environmentsModel.Environments;
            }
        );
    }

    private Task<Dictionary<string, AltinnOrgModel>> GetAltinnOrgs()
    {
        return _cache.GetOrCreateAsync(
            "EnvironmentsService:AltinnOrgs",
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = _cacheDuration;
                var response = await _httpClient.GetAsync(_generalSettings.OrganizationsUrl);
                response.EnsureSuccessStatusCode();
                var orgsModel = await response.Content.ReadFromJsonAsync<AltinnOrgsModel>();

                if (orgsModel == null)
                {
                    throw new InvalidOperationException(
                        "Failed to deserialize response content or content was empty."
                    );
                }
                return orgsModel.Orgs;
            }
        );
    }
}
