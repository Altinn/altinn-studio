using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

public class KubernetesWrapperClient : IKubernetesWrapperClient
{
    private const string PATH_TO_AZURE_ENV = "/kuberneteswrapper/api/v1/deployments";
    private readonly HttpClient _client;

    public KubernetesWrapperClient(HttpClient httpClient)
    {
        _client = httpClient;
    }

    public async Task<AzureDeploymentsResponse> GetDeploymentsInEnvAsync(string org, string app, EnvironmentModel env)
    {
        string pathToAzureEnv = $"{org}.{env.AppPrefix}.{env.Hostname}{PATH_TO_AZURE_ENV}?labelSelector=release={org}-{app}&envName={env.Name}";
        HttpResponseMessage response = await _client.GetAsync(pathToAzureEnv);
        if (response.IsSuccessStatusCode)
        {
            AzureDeploymentsResponse azureDeploymentsResponse = await response.Content.ReadAsAsync<AzureDeploymentsResponse>();
            return azureDeploymentsResponse;
        }

        throw new HttpRequestException("Were not able to reach application in cluster.");
    }
}
