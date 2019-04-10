using System;
using System.Threading.Tasks;
using k8s;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace KubernetesWrapper.Services.Implementation
{
    /// <summary>
    ///  An implementation of the kubernetes api wrapper
    /// </summary>
    public class IKubernetesAPIWrapperSI : IKubernetesAPIWrapper
    {
        private Kubernetes client;
        private ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IKubernetesAPIWrapperSI"/> class
        /// </summary>
        /// <param name="logger">The logger</param>
        public IKubernetesAPIWrapperSI(ILogger<IKubernetesAPIWrapperSI> logger)
        {
            _logger = logger;
            try
            {
                var config = KubernetesClientConfiguration.InClusterConfig();
                client = new Kubernetes(config);
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Unable to initialize IKubernetesAPIWrapperSI");
            }
        }

        /// <summary>
        /// Gets a list of deployments on the cluster. Parameters are described in further detail in the kubernetes api doc.
        /// </summary>
        /// <param name="continueParameter">Continue parameter. Defaults to null.</param>
        /// <param name="fieldSelector">A selector to restrict the list of returned objects by their labels. Defaults to everything</param>
        /// <param name="labelSelector">A selector to restrict the list of returned objects by their fields. Defaults to everything</param>
        /// <param name="limit">Limits the response length. </param>
        /// <param name="resourceVersion">Resource versions type</param>
        /// <param name="timeoutSeconds">Timeout in seconds</param>
        /// <param name="watch">Watch for changes to the described resources and return them as a stream of add, update, and remove notifications. Specify resourceVersion.</param>
        /// <param name="pretty">If 'true', then the output is pretty printed.</param>
        /// <returns>A V1DeploymentList</returns>
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
