using Altinn.Studio.KubernetesWrapper.Models;

namespace Altinn.Studio.KubernetesWrapper.Services.Interfaces;

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
    /// <param name="fieldSelector">A selector to restrict the list of returned objects by their fields. Defaults to everything</param>
    /// <param name="labelSelector">A selector to restrict the list of returned objects by their labels. Defaults to everything</param>
    /// <param name="limit">Limits the response length. </param>
    /// <param name="resourceVersion">Resource versions type</param>
    /// <param name="timeoutSeconds">Timeout in seconds</param>
    /// <param name="pretty">If true, the output is pretty printed.</param>
    /// <returns>A list of deployments</returns>
    Task<IList<DeployedResource>> GetDeployedResources(
        ResourceType resourceType,
        string? continueParameter = null,
        string? fieldSelector = null,
        string? labelSelector = null,
        int? limit = null,
        string? resourceVersion = null,
        int? timeoutSeconds = null,
        bool? pretty = null
    );
}
