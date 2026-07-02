using System.Net.Http.Headers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

/// <summary>
/// The app implementation of the process service.
/// </summary>
public class ProcessClient : IProcessClient
{
    private readonly AppSettings _appSettings;
    private readonly ILogger<ProcessClient> _logger;
    private readonly HttpClient _client;
    private readonly Telemetry? _telemetry;
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessClient"/> class.
    /// </summary>
    /// <param name="httpClient">A HttpClient from the HttpClientFactory.</param>
    /// <param name="serviceProvider">The service provider.</param>
    public ProcessClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        _appSettings = serviceProvider.GetRequiredService<IOptions<AppSettings>>().Value;
        _authenticationTokenResolver = serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();
        _logger = serviceProvider.GetRequiredService<ILogger<ProcessClient>>();
        _telemetry = serviceProvider.GetService<Telemetry>();

        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;
        httpClient.BaseAddress = new Uri(platformSettings.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        _client = httpClient;
    }

    /// <inheritdoc/>
    public Stream GetProcessDefinition()
    {
        using var activity = _telemetry?.StartGetProcessDefinitionActivity();
        string bpmnFilePath = Path.Join(
            _appSettings.AppBasePath,
            _appSettings.ConfigurationFolder,
            _appSettings.ProcessFolder,
            _appSettings.ProcessFileName
        );

        try
        {
            Stream processModel = File.OpenRead(bpmnFilePath);

            return processModel;
        }
        catch (Exception processDefinitionException)
        {
            _logger.LogError(
                $"Cannot find process definition file for this app. Have tried file location {bpmnFilePath}. Exception {processDefinitionException}"
            );
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<ProcessHistoryList> GetProcessHistory(
        string instanceGuid,
        string instanceOwnerPartyId,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        using var activity = _telemetry?.StartGetProcessHistoryActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/process/history";
        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod
        );

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

        if (response.IsSuccessStatusCode)
        {
            string eventData = await response.Content.ReadAsStringAsync();
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            ProcessHistoryList processHistoryList = JsonConvert.DeserializeObject<ProcessHistoryList>(eventData)!;

            return processHistoryList;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }
}
