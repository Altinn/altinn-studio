using Altinn.App.Core.Features.Bootstrap.Models;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Service responsible for aggregating all initial data required for application bootstrap.
/// </summary>
public interface IInitialDataService
{
    /// <summary>
    /// Aggregates all initial data required for the application startup.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="app">The application identifier.</param>
    /// <param name="instanceId">The instance identifier, if applicable.</param>
    /// <param name="partyId">The party identifier.</param>
    /// <param name="language">The language code for text resources.</param>
    /// <param name="cancellationToken">Cancellation token for the async operation.</param>
    /// <returns>A task that represents the asynchronous operation, containing the aggregated initial data.</returns>
    Task<InitialDataResponse> GetInitialData(
        string org,
        string app,
        string? instanceId = null,
        int? partyId = null,
        string? language = null,
        CancellationToken cancellationToken = default
    );
}
