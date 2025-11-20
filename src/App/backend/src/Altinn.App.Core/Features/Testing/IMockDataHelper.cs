using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Testing;

/// <summary>
/// Interface for merging mock data with real service responses.
/// Provides field-level mocking capabilities for Cypress tests.
/// </summary>
public interface IMockDataHelper
{
    /// <summary>
    /// Merges mock data over real UserProfile data.
    /// </summary>
    /// <param name="real">The real UserProfile from the service.</param>
    /// <param name="mockData">The mock data object to overlay.</param>
    /// <returns>UserProfile with mock data merged over real data.</returns>
    UserProfile MergeUserProfile(UserProfile real, object? mockData);

    /// <summary>
    /// Merges mock data over real Party list.
    /// </summary>
    /// <param name="real">The real Party list from the service.</param>
    /// <param name="mockData">The mock data array to overlay/add.</param>
    /// <returns>Party list with mock data merged over real data.</returns>
    List<Party> MergeParties(List<Party> real, object? mockData);

    /// <summary>
    /// Merges mock data over real ApplicationMetadata.
    /// </summary>
    /// <param name="real">The real ApplicationMetadata from the service.</param>
    /// <param name="mockData">The mock data object to overlay.</param>
    /// <returns>ApplicationMetadata with mock data merged over real data.</returns>
    ApplicationMetadata MergeApplicationMetadata(ApplicationMetadata real, object? mockData);

    /// <summary>
    /// Merges mock data over real Instance list.
    /// </summary>
    /// <param name="real">The real Instance list from the service.</param>
    /// <param name="mockData">The mock data array to overlay/add.</param>
    /// <returns>Instance list with mock data merged over real data.</returns>
    List<Instance> MergeInstances(List<Instance> real, object? mockData);

    /// <summary>
    /// Generic method for merging mock data over any object.
    /// </summary>
    /// <typeparam name="T">The type of object to merge.</typeparam>
    /// <param name="realObject">The real object from the service.</param>
    /// <param name="mockData">The mock data object to overlay.</param>
    /// <returns>Object with mock data merged over real data.</returns>
    T MergeObject<T>(T realObject, object? mockData)
        where T : class;
}
