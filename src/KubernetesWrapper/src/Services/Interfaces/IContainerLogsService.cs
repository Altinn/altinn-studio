using KubernetesWrapper.Models;

namespace KubernetesWrapper.Services.Interfaces;

/// <summary>
/// Interface for the container logs service
/// </summary>
public interface IContainerLogsService
{
    /// <summary>
    /// Get all container logs
    /// </summary>
    /// <param name="app">The application name to filter logs by. If null or empty, returns logs for all applications.</param>
    /// <param name="take">The maximum number of log entries to return.</param>
    /// <param name="time">The time range in hours to look back for container logs.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of container logs</returns>
    Task<IEnumerable<ContainerLog>> GetAll(string app, int take, double time, CancellationToken cancellationToken);
}
