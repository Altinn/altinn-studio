using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
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
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var originEnvironment = GetOriginEnvironment();
        var requestUrl = $"{baseUrl}/runtime/gateway/api/v1/deploy/apps/{app}/{originEnvironment}/deployed";

        var response = await client.GetFromJsonAsync<IsAppDeployedResponse>(requestUrl, cancellationToken);
        return response?.IsDeployed ?? false;
    }

    public async Task TriggerReconcileAsync(string org, string app, AltinnEnvironment environment, bool isNewApp, bool isUndeploy, CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var originEnvironment = GetOriginEnvironment();
        var requestUrl = $"{baseUrl}/runtime/gateway/api/v1/deploy/apps/{app}/{originEnvironment}/reconcile";

        var request = new TriggerReconcileRequest(isNewApp, isUndeploy);
        var response = await HttpClientJsonExtensions.PostAsJsonAsync(client, requestUrl, request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private record TriggerReconcileRequest(bool IsNewApp, bool IsUndeploy);

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
