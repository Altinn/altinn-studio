using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

/// <summary>
/// Interface representing a service that provides information about running applications within an organization.
/// </summary>
public interface IKubernetesWrapperService
{
    /// <summary>
    /// Asynchronously retrieves a list of running applications for the specified organization.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <returns>The task result contains a list of running applications.</returns>
    public Task<List<AppException>?> GetAppExceptions(string org, string env, string app, string time, CancellationToken ct);

    /// <summary>
    /// Asynchronously retrieves a list of running applications for the specified organization.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <returns>The task result contains a list of running applications.</returns>
    public Task<List<AppFailedRequest>?> GetAppFailedRequests(string org, string env, string app, string time, CancellationToken ct);

    /// <summary>
    /// Asynchronously retrieves a list of running applications for the specified organization.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <returns>The task result contains a list of running applications.</returns>
    public Task<List<ContainerLog>?> GetContainerLogs(string org, string env, string app, string time, CancellationToken ct);
}
