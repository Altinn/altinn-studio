using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Instances;

/// <summary>
/// Interface for handling instance event related operations
/// </summary>
public interface IInstanceEventClient
{
    /// <summary>
    /// Stores the instance event
    /// </summary>
    /// <param name="dataToSerialize">The instance event to store</param>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <param name="authenticationMethod">Optional authentication method override.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<string> SaveInstanceEvent(
        object dataToSerialize,
        string org,
        string app,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the instance events related to the instance matching the instance id.
    /// </summary>
    /// <param name="instanceId">The instance guid</param>
    /// <param name="instanceOwnerPartyId">The instance owner party id</param>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <param name="eventTypes">The event types to filter on</param>
    /// <param name="from">Lower bound of the event creation time</param>
    /// <param name="to">Upper bound of the event creation time</param>
    /// <param name="authenticationMethod">Optional authentication method override.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<List<InstanceEvent>> GetInstanceEvents(
        string instanceId,
        string instanceOwnerPartyId,
        string org,
        string app,
        string[] eventTypes,
        string from,
        string to,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );
}
