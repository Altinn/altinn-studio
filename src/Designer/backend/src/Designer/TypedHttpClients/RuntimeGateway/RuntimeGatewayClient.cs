using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
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
        var client = _httpClientFactory.CreateClient($"runtime-gateway");
        var baseUrl = GetGatewayUrl(org, environment);
        var originEnvironment = GetOriginEnvironment();
        var requestUrl = $"{baseUrl}/deploy/apps/{app}/{originEnvironment}/deployed";

        var response = await client.GetFromJsonAsync<IsAppDeployedResponse>(requestUrl, cancellationToken);
        return response?.IsDeployed ?? false;
    }

    private string GetGatewayUrl(string org, AltinnEnvironment environment)
    {
        if (environment.Name is "prod" or "production")
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
