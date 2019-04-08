using System.Collections.Generic;
using System.Threading.Tasks;

namespace KubernetesWrapper.Services.Interfaces
{
    public interface IKubernetesAPIWrapper
    {
        Task<k8s.Models.V1DeploymentList> GetDeployments(
            string continueParameter = null,
            string fieldSelector = null,
            string labelSelector = null,
            int? limit = null,
            string resourceVersion = null,
            int? timeoutSeconds = null,
            bool? watch = null,
            string pretty = null
            );
    }
}
