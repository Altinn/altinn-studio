using Altinn.App.Core.Features.Correspondence.Models;

namespace Altinn.App.Core.Features.Correspondence;

/// <summary>
/// Contains logic for interacting with the correspondence message service
/// </summary>
public interface ICorrespondenceClient
{
    /// <summary>
    /// Sends a correspondence
    /// </summary>
    /// <param name="payload">The <see cref="SendCorrespondencePayload"/> payload</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns></returns>
    Task<SendCorrespondenceResponse> Send(
        SendCorrespondencePayload payload,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Fetches the status of a correspondence
    /// </summary>
    /// <param name="payload">The <see cref="GetCorrespondenceStatusPayload"/> payload</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns></returns>
    Task<GetCorrespondenceStatusResponse> GetStatus(
        GetCorrespondenceStatusPayload payload,
        CancellationToken cancellationToken = default
    );
}
