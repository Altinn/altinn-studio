using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

public interface IKubernetesWrapperClient
{
    Task<IList<Deployment>> GetDeploymentsInEnvAsync(string org, EnvironmentModel env);
}
