using KubernetesWrapper.Models;

namespace KubernetesWrapper.Services.Interfaces;

/// <summary>
/// Interface for the logs service
/// </summary>
public interface ILogsService
{
    /// <summary>
    /// Get all logs
    /// </summary>
    /// <param name="app">The application name to filter requests by. If null or empty, returns requests for all applications.</param>
    /// <param name="take">The maximum number of logs to return.</param>
    /// <param name="time">The time range in hours to look back for logs.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of logs</returns>
    Task<IEnumerable<Log>> GetAll(string app, int take, double time, CancellationToken cancellationToken);
}
