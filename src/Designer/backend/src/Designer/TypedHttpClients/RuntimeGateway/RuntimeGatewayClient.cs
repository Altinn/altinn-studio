using System;
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

    public async Task<IEnumerable<AppDeployment>> GetAppDeployments(string org, AltinnEnvironment environment, CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var requestUrl = $"{baseUrl}/runtime/gateway/api/v1/deploy/origin/{_generalSettings.OriginEnvironment}/apps";

        var response = await client.GetFromJsonAsync<List<AppDeployment>>(requestUrl, cancellationToken);
        return response
            ?? throw new InvalidOperationException(
                "Received empty or null response body when deserializing List<AppDeployment>."
            );
    }

    public async Task<AppDeployment> GetAppDeployment(string org, string app, AltinnEnvironment environment, CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var requestUrl = $"{baseUrl}/runtime/gateway/api/v1/deploy/apps/{app}/{_generalSettings.OriginEnvironment}";

        var response = await client.GetFromJsonAsync<AppDeployment>(requestUrl, cancellationToken);
        return response
            ?? throw new InvalidOperationException(
                "Received empty or null response body when deserializing AppDeployment."
            );
    }

    public async Task<bool> IsAppDeployedWithGitOpsAsync(string org, string app, AltinnEnvironment environment, CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var requestUrl = $"{baseUrl}/runtime/gateway/api/v1/deploy/apps/{app}/{_generalSettings.OriginEnvironment}/deployed";

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
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/runtime/gateway/api/v1/alerts";

        return await client.GetFromJsonAsync<IEnumerable<AlertRule>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<ErrorMetric>> GetErrorMetricsAsync(
        string org,
        AltinnEnvironment environment,
        int range,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/runtime/gateway/api/v1/metrics/errors?range={range}";

        return await client.GetFromJsonAsync<IEnumerable<ErrorMetric>>(requestUrl, cancellationToken) ?? [];
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
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/runtime/gateway/api/v1/metrics/app?app={Uri.EscapeDataString(app)}&range={range}";

        return await client.GetFromJsonAsync<IEnumerable<AppMetric>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppErrorMetric>> GetAppErrorMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/runtime/gateway/api/v1/metrics/app/errors?app={Uri.EscapeDataString(app)}&range={range}";

        return await client.GetFromJsonAsync<IEnumerable<AppErrorMetric>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/runtime/gateway/api/v1/metrics/app/health?app={Uri.EscapeDataString(app)}";

        return await client.GetFromJsonAsync<IEnumerable<AppHealthMetric>>(requestUrl, cancellationToken) ?? [];
    }

    public async Task TriggerReconcileAsync(string org, string app, AltinnEnvironment environment, bool isUndeploy, CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var requestUrl = $"{baseUrl}/runtime/gateway/api/v1/deploy/apps/{app}/{_generalSettings.OriginEnvironment}/reconcile";

        var request = new TriggerReconcileRequest(isUndeploy);
        var response = await HttpClientJsonExtensions.PostAsJsonAsync(client, requestUrl, request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private record TriggerReconcileRequest(bool IsUndeploy);
}
