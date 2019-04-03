using KubernetesWrapper.Services.Interfaces;
using k8s;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace KubernetesWrapper.Services.Implementation
{
    public class IKubernetesAPIWrapperSI : IKubernetesAPIWrapper
    {
        private Kubernetes client;

        public IKubernetesAPIWrapperSI()
        {
            var config = KubernetesClientConfiguration.InClusterConfig();
            client = new Kubernetes(config);
        }

        async Task<k8s.Models.V1DeploymentList> IKubernetesAPIWrapper.GetDeployments(
             string continueParameter,
             string fieldSelector,
             string labelSelector,
             int? limit,
             string pretty,
             string resourceVersion,
             int? timeoutSeconds,
             bool? watch)
        {
            var deployments = await client.ListDeploymentForAllNamespacesAsync(
                continueParameter, fieldSelector, labelSelector, limit, pretty, resourceVersion, timeoutSeconds, watch
            );
            return deployments;
        }
    }
}
