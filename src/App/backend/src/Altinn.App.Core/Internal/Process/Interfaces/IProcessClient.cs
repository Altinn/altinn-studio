using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Process service that encapsulate reading of the BPMN process definition.
/// </summary>
public interface IProcessClient
{
    /// <summary>
    /// Returns a stream that contains the process definition.
    /// </summary>
    /// <returns>the stream</returns>
    Stream GetProcessDefinition();

    /// <summary>
    /// Gets the instance process events related to the instance matching the instance id.
    /// </summary>
    /// <param name="instanceGuid">The instance guid</param>
    /// <param name="instanceOwnerPartyId">The instance owner party id</param>
    /// <param name="authenticationMethod">Optional authentication method override.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<ProcessHistoryList> GetProcessHistory(
        string instanceGuid,
        string instanceOwnerPartyId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );
}
