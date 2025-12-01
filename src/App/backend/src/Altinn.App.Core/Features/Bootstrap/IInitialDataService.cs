using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Service responsible for aggregating all initial data required for application bootstrap.
/// </summary>
public interface IInitialDataService
{
    /// <summary>
    /// Aggregates all initial data required for the application startup in an authenticated context.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="app">The application identifier.</param>
    /// <param name="user">The authenticated user.</param>
    /// <param name="userDetails">The authenticated user's details.</param>
    /// <param name="instanceId">The instance identifier, if applicable.</param>
    /// <param name="language">The language code for text resources.</param>
    /// <param name="cancellationToken">Cancellation token for the async operation.</param>
    /// <returns>A task that represents the asynchronous operation, containing the aggregated initial data.</returns>
    Task<InitialDataResponseAuthenticated> GetInitialDataAuthenticated(
        string org,
        string app,
        Authenticated.User user,
        Authenticated.User.Details userDetails,
        string? instanceId = null,
        string? language = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Aggregates all initial data required for the application startup in an anonymous context.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="app">The application identifier.</param>
    /// <param name="language">The language code for text resources.</param>
    /// <param name="cancellationToken">Cancellation token for the async operation.</param>
    /// <returns>A task that represents the asynchronous operation, containing the aggregated initial data.</returns>
    Task<InitialDataResponse> GetInitialData(
        string org,
        string app,
        string? language = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Retrieves mock data for the application, if available.
    /// </summary>
    /// <returns>A dictionary containing mock data, or null if no mock data is available.</returns>
    Dictionary<string, object>? GetMockData();
}
