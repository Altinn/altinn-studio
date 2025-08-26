using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

/// <summary>
/// Interface for interacting with the Kubernetes Wrapper service.
/// </summary>
public interface IKubernetesWrapperService
{
    /// <summary>
    /// Asynchronously retrieves a list of logs for the specified organization.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <returns>The task result contains a list of logs.</returns>
    public Task<IEnumerable<Log>> GetLogs(string org, string env, int time, string? app, CancellationToken ct);

    /// <summary>
    /// Asynchronously retrieves a list of container logs for the specified organization.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <returns>The task result contains a list of container logs.</returns>
    public Task<IEnumerable<ContainerLog>> GetContainerLogs(string org, string env, int time, string? app, CancellationToken ct);
}
