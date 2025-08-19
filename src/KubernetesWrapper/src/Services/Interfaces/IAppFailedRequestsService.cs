using KubernetesWrapper.Models;

namespace KubernetesWrapper.Services.Interfaces;

/// <summary>
/// Interface for the failed requests service
/// </summary>
public interface IAppFailedRequestsService
{
    /// <summary>
    /// Get all failed requests
    /// </summary>
    /// <param name="app">The application name to filter requests by. If null or empty, returns requests for all applications.</param>
    /// <param name="take">The maximum number of failed requests to return.</param>
    /// <param name="time">The time range in hours to look back for failed requests.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of failed requests</returns>
    Task<IEnumerable<Log>> GetAll(string app, int take, double time, CancellationToken cancellationToken);
}
