using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Implementation;

public class KubernetesWrapperService : IKubernetesWrapperService
{
    private const string PATH_TO_AZURE_ENV = "/kuberneteswrapper/api/v1/deployments";
    private static readonly HttpClient client = new();

    public async Task<AzureDeploymentsResponse> GetDeploymentsInEnvAsync(string org, string app, EnvironmentModel env)
    {
        string pathToAzureEnv = $"{org}.{env.AppPrefix}.{env.Hostname}{PATH_TO_AZURE_ENV}?labelSelector=release={org}-{app}&envName={env.Name}";
        AzureDeploymentsResponse azureDeploymentsResponse = null;
        HttpResponseMessage response = await client.GetAsync(pathToAzureEnv);
        if (response.IsSuccessStatusCode)
        {
            azureDeploymentsResponse = await response.Content.ReadAsAsync<AzureDeploymentsResponse>();
        }
        return azureDeploymentsResponse;
    }

}
