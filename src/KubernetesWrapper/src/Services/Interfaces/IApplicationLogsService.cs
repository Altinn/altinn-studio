using KubernetesWrapper.Models;

namespace KubernetesWrapper.Services.Interfaces;

/// <summary>
/// Interface for the application logs service
/// </summary>
public interface IApplicationLogsService
{
    /// <summary>
    /// Get the list of application logs
    /// </summary>
    /// <param name="app">The application name to filter logs by. If null or empty, returns logs for all applications.</param>
    /// <param name="take">The maximum number of log entries to return.</param>
    /// <param name="time">The time range in hours to look back for application logs.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of application logs</returns>
    Task<IEnumerable<Log>> GetLogs(string app, int take, double time, CancellationToken cancellationToken);
}
