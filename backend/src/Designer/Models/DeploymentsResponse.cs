using System.Collections.Generic;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Deployments response
    /// </summary>
    public class DeploymentsResponse
    {
        public List<DeploymentEntity> PipelineDeploymentList { get; set; }

        public List<KubernetesDeployment> KubernetesDeploymentList { get; set; }
    }
}
