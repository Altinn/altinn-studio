using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IKubernetesWrapperService
{
    Task<AzureDeploymentsResponse> GetDeploymentsInEnvAsync(string org, string app, EnvironmentModel env);
}
