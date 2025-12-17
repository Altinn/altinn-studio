using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public class RuntimeGatewayClient : IRuntimeGatewayClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GeneralSettings _generalSettings;
    private readonly IEnvironmentsService _environmentsService;

    public RuntimeGatewayClient(IHttpClientFactory httpClientFactory, GeneralSettings generalSettings, IEnvironmentsService environmentsService)
    {
        _httpClientFactory = httpClientFactory;
        _generalSettings = generalSettings;
        _environmentsService = environmentsService;
    }

    public async Task<bool> IsAppDeployedWithGitOpsAsync(string org, string app, AltinnEnvironment environment, CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient($"runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var originEnvironment = GetOriginEnvironment();
        var requestUrl = $"{baseUrl}/runtime/gateway/api/v1/deploy/apps/{app}/{originEnvironment}/deployed";

        var response = await client.GetFromJsonAsync<IsAppDeployedResponse>(requestUrl, cancellationToken);
        return response?.IsDeployed ?? false;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AlertRule>> GetAlertRulesAsync(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient($"runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/alerts";

        return await client.GetFromJsonAsync<List<AlertRule>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<MetricsResponse> GetMetricsAsync(
        string org,
        AltinnEnvironment environment,
        int range,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient($"runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/metrics?range={range}";

        return await client.GetFromJsonAsync<MetricsResponse>(requestUrl, cancellationToken) ?? new MetricsResponse { SubscriptionId = "", Metrics = [] };
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient($"runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/metrics/app?app={app}&range={range}";

        return await client.GetFromJsonAsync<List<AppMetric>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient($"runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/metrics/app/health?app={app}";

        return await client.GetFromJsonAsync<List<AppHealthMetric>>(requestUrl, cancellationToken) ?? [];
    }

    private string GetOriginEnvironment()
    {
        var hostName = _generalSettings.HostName;

        if (hostName.StartsWith("dev."))
        {
            return "dev";
        }

        if (hostName.StartsWith("staging."))
        {
            return "staging";
        }

        return "prod";
    }
}
