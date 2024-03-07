using System.Collections.Generic;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Deployment
    /// </summary>
    public class DeploymentResponse
    {
        public List<DeploymentEntity> PipelineDeploymentList { get; set; }

        public List<KubernetesDeployment> KubernetesDeploymentList { get; set; }
    }
}
