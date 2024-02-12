using System.Collections.Generic;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Services.Models
{
    /// <summary>
    /// Deployment
    /// </summary>
    public class Deployment
    {
        public string envName { get; set; }

        public List<DeploymentEntity> PipelineDeploymentList { get; set; }

        public KubernetesDeployment KubernetesDeployment { get; set; }
    }
}
