using k8s;
using k8s.Models;

using KubernetesWrapper.Models;
using KubernetesWrapper.Services.Interfaces;

namespace KubernetesWrapper.Services.Implementation
{
    /// <summary>
    ///  An implementation of the Kubernetes API wrapper
    /// </summary>
    public class KubernetesApiWrapper : IKubernetesApiWrapper
    {
        private readonly Kubernetes _client;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="KubernetesApiWrapper"/> class
        /// </summary>
        /// <param name="logger">The logger</param>
        public KubernetesApiWrapper(ILogger<KubernetesApiWrapper> logger)
        {
            _logger = logger;
            try
            {
                var config = KubernetesClientConfiguration.InClusterConfig();
                _client = new Kubernetes(config);
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Unable to initialize KubernetesApiWrapper");
            }
        }

        /// <inheritdoc/>
        async Task<IList<DeployedResource>> IKubernetesApiWrapper.GetDeployedResources(
            ResourceType resourceType,
            string continueParameter,
            bool? allowWatchBookmarks,
            string fieldSelector,
            string labelSelector,
            int? limit,
            string resourceVersion,
            int? timeoutSeconds,
            bool? watch,
            bool? pretty)
        {
            IList<DeployedResource> mappedResources = new List<DeployedResource>();

            switch (resourceType)
            {
                case ResourceType.Deployment:
                    V1DeploymentList deployments = await _client.ListNamespacedDeploymentAsync("default", allowWatchBookmarks, continueParameter, fieldSelector, labelSelector, limit, resourceVersion, null, timeoutSeconds, watch, pretty);
                    mappedResources = MapDeployments(deployments.Items);
                    break;
                case ResourceType.DaemonSet:
                    V1DaemonSetList deamonSets = await _client.ListNamespacedDaemonSetAsync("default", allowWatchBookmarks, continueParameter, fieldSelector, labelSelector, limit, resourceVersion, null, timeoutSeconds, watch, pretty);
                    mappedResources = MapDaemonSets(deamonSets.Items);
                    break;
            }

            return mappedResources;
        }

        /// <summary>
        /// Maps a list of k8s.Models.V1DaemonSet to DaemonSet
        /// </summary>
        /// <param name="list">The list to be mapped</param>
        private static IList<DeployedResource> MapDaemonSets(IList<V1DaemonSet> list)
        {
            IList<DeployedResource> mappedList = new List<DeployedResource>();
            if (list == null || list.Count == 0)
            {
                return mappedList;
            }

            foreach (V1DaemonSet element in list)
            {
                IList<V1Container> containers = element.Spec?.Template?.Spec?.Containers;
                if (containers != null && containers.Count > 0)
                {
                    DaemonSet daemonSet = new DaemonSet { Release = element.Metadata?.Name };

                    string[] splittedVersion = containers[0].Image?.Split(":");
                    if (splittedVersion != null && splittedVersion.Length > 1)
                    {
                        daemonSet.Version = splittedVersion[1];
                    }

                    mappedList.Add(daemonSet);
                }
            }

            return mappedList;
        }

        /// <summary>
        /// Maps a list of k8s.Models.V1Deployment to Deployment
        /// </summary>
        /// <param name="list">The list to be mapped</param>
        private static IList<DeployedResource> MapDeployments(IList<V1Deployment> list)
        {
            IList<DeployedResource> mappedList = new List<DeployedResource>();
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

                if (labels != null && labels.TryGetValue("release", out string release))
                {
                    deployment.Release = release;
                }

                mappedList.Add(deployment);
            }

            return mappedList;
        }
    }
}
