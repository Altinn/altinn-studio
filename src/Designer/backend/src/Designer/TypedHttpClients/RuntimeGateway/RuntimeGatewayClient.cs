using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public class RuntimeGatewayClient : IRuntimeGatewayClient
{
    private readonly RuntimeGatewaySettings _runtimeGatewaySettings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GeneralSettings _generalSettings;

    public RuntimeGatewayClient(RuntimeGatewaySettings runtimeGatewaySettings, IHttpClientFactory httpClientFactory, GeneralSettings generalSettings)
    {
        _runtimeGatewaySettings = runtimeGatewaySettings;
        _httpClientFactory = httpClientFactory;
        _generalSettings = generalSettings;
    }

    public async Task<bool> IsAppDeployedWithGitOpsAsync(string org, string app, AltinnEnvironment environment, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.GetRuntimeGatewayHttpClient(environment);
        var baseUrl = GetGatewayUrl(org, environment);
        var originEnvironment = GetOriginEnvironment();
        var requestUrl = $"{baseUrl}/deploy/apps/{app}/{originEnvironment}/deployed";

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
        HttpClient client = _httpClientFactory.GetRuntimeGatewayHttpClient(environment);
        string baseUrl = GetGatewayUrl(org, environment);
        string requestUrl = $"{baseUrl}/alerts";

        return await client.GetFromJsonAsync<List<AlertRule>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(
        string org,
        AltinnEnvironment environment,
        int range,
        CancellationToken cancellationToken
    )
    {
        HttpClient client = _httpClientFactory.GetRuntimeGatewayHttpClient(environment);
        string baseUrl = GetGatewayUrl(org, environment);
        string requestUrl = $"{baseUrl}/metrics?range={range}";

        return await client.GetFromJsonAsync<List<Metric>>(requestUrl, cancellationToken) ?? [];
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
        HttpClient client = _httpClientFactory.GetRuntimeGatewayHttpClient(environment);
        string baseUrl = GetGatewayUrl(org, environment);
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
        HttpClient client = _httpClientFactory.GetRuntimeGatewayHttpClient(environment);
        string baseUrl = GetGatewayUrl(org, environment);
        string requestUrl = $"{baseUrl}/metrics/app/health?app={app}";

        return await client.GetFromJsonAsync<List<AppHealthMetric>>(requestUrl, cancellationToken) ?? [];
    }

    private string GetGatewayUrl(string org, AltinnEnvironment environment)
    {
        if (environment == AltinnEnvironment.Prod)
        {
            return string.Format(_runtimeGatewaySettings.ProdUrlFormat, org);
        }

        if (environment.Name.StartsWith("tt"))
        {
            return string.Format(_runtimeGatewaySettings.TtUrlFormat, org, environment.Name);
        }

        return string.Format(_runtimeGatewaySettings.AtYtUrlFormat, org, environment.Name);
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
