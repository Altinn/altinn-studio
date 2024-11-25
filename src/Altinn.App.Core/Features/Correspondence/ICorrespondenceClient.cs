using Altinn.App.Core.Features.Correspondence.Models;

namespace Altinn.App.Core.Features.Correspondence;

/// <summary>
/// Contains logic for interacting with the correspondence message service
/// </summary>
public interface ICorrespondenceClient
{
    /// <summary>
    /// <para>Sends a correspondence.</para>
    /// <para>After a successful request, the state of the correspondence order is <see cref="CorrespondenceStatus.Initialized"/>.
    /// This indicates that the request has met all validation requirements and is considered valid, but until the state
    /// reaches <see cref="CorrespondenceStatus.Published"/> it has not actually been sent to the recipient.</para>
    /// <para>The current status of a correspondence and the associated notifications can be checked via <see cref="GetStatus"/>.</para>
    /// <para>Alternatively, the correspondence service publishes events which can be subscribed to.
    /// For more information, see https://docs.altinn.studio/correspondence/getting-started/developer-guides/events/</para>
    /// </summary>
    /// <param name="payload">The <see cref="SendCorrespondencePayload"/> payload</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<SendCorrespondenceResponse> Send(
        SendCorrespondencePayload payload,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Fetches the status of a correspondence
    /// </summary>
    /// <param name="payload">The <see cref="GetCorrespondenceStatusPayload"/> payload</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<GetCorrespondenceStatusResponse> GetStatus(
        GetCorrespondenceStatusPayload payload,
        CancellationToken cancellationToken = default
    );
}
