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

        /// <inheritdoc/>
        async Task<k8s.Models.V1DeploymentList> IKubernetesAPIWrapper.GetDeployments(
            string continueParameter,
            bool? allowWatchBookmarks,
            string fieldSelector,
            string labelSelector,
            int? limit,
            string resourceVersion,
            int? timeoutSeconds,
            bool? watch,
            string pretty)
        {
            var deployments = await client.ListNamespacedDeploymentAsync("default", allowWatchBookmarks, continueParameter, fieldSelector, labelSelector, limit, resourceVersion, timeoutSeconds, watch, pretty);
            return deployments;
        }
    }
}
