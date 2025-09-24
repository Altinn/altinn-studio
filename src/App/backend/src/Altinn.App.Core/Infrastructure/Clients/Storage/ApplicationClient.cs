using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.App;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

/// <summary>
/// Client for retrieving application for Altinn Platform
/// </summary>
public class ApplicationClient : IApplicationClient
{
    private readonly ILogger _logger;
    private readonly HttpClient _client;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationClient"/> class.
    /// </summary>
    /// <param name="platformSettings">The current platform settings.</param>
    /// <param name="logger">A logger.</param>
    /// <param name="httpClient">An HttpClient provided by the HttpClientFactory.</param>
    public ApplicationClient(
        IOptions<PlatformSettings> platformSettings,
        ILogger<ApplicationClient> logger,
        HttpClient httpClient
    )
    {
        _logger = logger;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        _client = httpClient;
    }

    /// <inheritdoc />
    public async Task<Application?> GetApplication(string org, string app)
    {
        string appId = $"{org}/{app}";

        Application? application = null;
        string getApplicationMetadataUrl = $"applications/{appId}";

        HttpResponseMessage response = await _client.GetAsync(getApplicationMetadataUrl);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            string applicationData = await response.Content.ReadAsStringAsync();
            application = JsonConvert.DeserializeObject<Application>(applicationData);
        }
        else
        {
            _logger.LogError($"Unable to fetch application with application id {appId}");
        }

        return application;
    }
}
