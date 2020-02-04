using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using k8s;
using k8s.Models;
using KubernetesWrapper.Models;
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
        async Task<IList<Deployment>> IKubernetesAPIWrapper.GetDeployments(
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
            V1DeploymentList deployments = await client.ListNamespacedDeploymentAsync("default", allowWatchBookmarks, continueParameter, fieldSelector, labelSelector, limit, resourceVersion, timeoutSeconds, watch, pretty);
            IList<Deployment> mappedDeployments = MapDeployments(deployments.Items);
            return mappedDeployments;
        }

        /// <summary>
        /// Maps a list of k8s.Models.V1Deployment to Deployment
        /// </summary>
        /// <param name="list">The list to be mapped</param>
        private IList<Deployment> MapDeployments(IList<V1Deployment> list)
        {
            IList<Deployment> mappedList = new List<Deployment>();
            if (list == null || list.Count == 0)
            {
                return mappedList;
            }

            foreach (V1Deployment element in list)
            {
                Deployment deployment = new Deployment();
                IList<V1Container> containers = element.Spec?.Template?.Spec?.Containers;
                if (containers != null && containers.Count > 0)
                {
                    string[] splittedVersion = containers[0].Image?.Split(":");
                    if (splittedVersion != null && splittedVersion.Length > 1)
                    {
                        deployment.Version = splittedVersion[1];
                    }
                }

                var labels = element.Metadata?.Labels;
                if (labels != null)
                {
                    string release;
                    if (labels.TryGetValue("release", out release))
                    {
                        deployment.Release = release;
                    }
                }

                mappedList.Add(deployment);
            }

            return mappedList;
        }
    }
}
