using System;
using System.Linq;
using System.Net;
using System.Net.Http;
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
    private readonly IMemoryCache _cache;
    private readonly ILogger<EnvironmentsService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="EnvironmentsService"/> class.
    /// </summary>
    /// <param name="httpClient">System.Net.Http.HttpClient</param>
    /// <param name="generalSettingsOptions">GeneralSettings</param>
    /// <param name="memoryCache">The configured memory cache</param>
    /// <param name="logger">The configured logger</param>
    public EnvironmentsService(
        HttpClient httpClient,
        GeneralSettings generalSettingsOptions,
        IMemoryCache memoryCache,
        ILogger<EnvironmentsService> logger
    )
    {
        _generalSettings = generalSettingsOptions;
        _httpClient = httpClient;
        _cache = memoryCache;
        _logger = logger;
    }

    /// <summary>
    /// Gets list of environments
    /// </summary>
    /// <returns>List of environments</returns>
    public async Task<EnvironmentModel[]> GetEnvironments()
    {
        EnvironmentModel[] environmentModel = null;
        string cachekey = System.Reflection.MethodBase.GetCurrentMethod().Name;
        if (!_cache.TryGetValue(cachekey, out environmentModel))
        {
            HttpResponseMessage response = await _httpClient.GetAsync(_generalSettings.EnvironmentsUrl);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                var result = await response.Content.ReadAsAsync<EnvironmentsModel>();
                environmentModel = result.Environments;
            }
        }

        return environmentModel;
    }

    public async Task<EnvironmentModel> GetEnvModelByName(string envName)
    {
        EnvironmentModel[] environmentModels = await this.GetEnvironments();
        return environmentModels.SingleOrDefault(item => item.Name == envName);
    }

    public async Task<Uri> CreatePlatformUri(string envName)
    {
        var envModel = await GetEnvModelByName(envName);
        return new Uri(envModel.PlatformUrl);
    }

    public async Task<string> GetHostNameByEnvName(string envName)
    {
        var envModel = await GetEnvModelByName(envName);
        return envModel.Hostname;
    }
}
