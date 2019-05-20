using System.Collections.Generic;
using System.Threading.Tasks;

namespace KubernetesWrapper.Services.Interfaces
{
    /// <summary>
    /// Interface for the kubernetes api wrapper
    /// </summary>
    public interface IKubernetesAPIWrapper
    {
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
        Task<k8s.Models.V1DeploymentList> GetDeployments(
            string continueParameter = null,
            string fieldSelector = null,
            string labelSelector = null,
            int? limit = null,
            string resourceVersion = null,
            int? timeoutSeconds = null,
            bool? watch = null,
            string pretty = null);
    }
}
