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
             string resourceVersion,
             int? timeoutSeconds,
             bool? watch,
            string pretty)
        {

            var deployments = await client.ListNamespacedDeploymentAsync("default", continueParameter, fieldSelector, labelSelector, limit, resourceVersion, timeoutSeconds, watch, pretty);
            return deployments;
        }
    }
}
