using KubernetesWrapper.Models;

namespace KubernetesWrapper.Services.Interfaces
{
    /// <summary>
    /// Interface for the kubernetes api wrapper
    /// </summary>
    public interface IKubernetesApiWrapper
    {
        /// <summary>
        /// Gets a list of deployed resources of a given type in the cluster. Parameters are described in further detail in the kubernetes api doc.
        /// </summary>
        /// <param name="resourceType">The deployed resource type to retrieve.</param>
        /// <param name="continueParameter">Continue parameter. Defaults to null.</param>
        /// <param name="allowWatchBookmarks">allowWatchBookmarks requests watch events with type "BOOKMARK". Servers that do not implement bookmarks may ignore this flag and bookmarks are sent at the server's discretion.</param>
        /// <param name="fieldSelector">A selector to restrict the list of returned objects by their fields. Defaults to everything</param>
        /// <param name="labelSelector">A selector to restrict the list of returned objects by their labels. Defaults to everything</param>
        /// <param name="limit">Limits the response length. </param>
        /// <param name="resourceVersion">Resource versions type</param>
        /// <param name="timeoutSeconds">Timeout in seconds</param>
        /// <param name="watch">Watch for changes to the described resources and return them as a stream of add, update, and remove notifications. Specify resourceVersion.</param>
        /// <param name="pretty">If 'true', then the output is pretty printed.</param>
        /// <returns>A list of deployments</returns>
        Task<IList<DeployedResource>> GetDeployedResources(
            ResourceType resourceType,
            string continueParameter = null,
            bool? allowWatchBookmarks = null,
            string fieldSelector = null,
            string labelSelector = null,
            int? limit = null,
            string resourceVersion = null,
            int? timeoutSeconds = null,
            bool? watch = null,
            bool? pretty = null);
    }
}
