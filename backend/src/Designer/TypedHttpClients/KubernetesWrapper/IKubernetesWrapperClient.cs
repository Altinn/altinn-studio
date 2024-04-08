using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

public interface IKubernetesWrapperClient
{
    Task<KubernetesDeployment> GetDeploymentAsync(string org, string app, EnvironmentModel env);
}
