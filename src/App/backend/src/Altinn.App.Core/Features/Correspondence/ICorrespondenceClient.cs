using Altinn.App.Core.Features.Correspondence.Models;

namespace Altinn.App.Core.Features.Correspondence;

/// <summary>
/// <p>Contains logic for interacting with the correspondence message service.</p>
/// <p>The use of this client requires Maskinporten scopes <c>altinn:correspondence.write</c> and <c>altinn:serviceowner</c>.</p>
/// </summary>
public interface ICorrespondenceClient
{
    /// <summary>
    /// <p>Sends a correspondence.</p>
    /// <p>After a successful request, the state of the correspondence order is <see cref="CorrespondenceStatus.Initialized"/>.
    /// This indicates that the request has met all validation requirements and is considered valid, but until the state
    /// reaches <see cref="CorrespondenceStatus.Published"/> it has not actually been sent to the recipient.</p>
    /// <p>The current status of a correspondence and the associated notifications can be checked via <see cref="GetStatus"/>.</p>
    /// <p>Alternatively, the correspondence service publishes events which can be subscribed to.
    /// For more information, see https://docs.altinn.studio/correspondence/getting-started/developer-guides/events/.</p>
    /// </summary>
    /// <param name="payload">The <see cref="SendCorrespondencePayload"/> payload</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<SendCorrespondenceResponse> Send(
        SendCorrespondencePayload payload,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Fetches the status of a correspondence.
    /// </summary>
    /// <param name="payload">The <see cref="GetCorrespondenceStatusPayload"/> payload</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<GetCorrespondenceStatusResponse> GetStatus(
        GetCorrespondenceStatusPayload payload,
        CancellationToken cancellationToken = default
    );
}
