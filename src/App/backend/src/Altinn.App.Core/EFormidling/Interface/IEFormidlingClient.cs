using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.EFormidling.Models.SBD;

namespace Altinn.App.Core.EFormidling.Interface;

/// <summary>
/// Actions on the eFormidling integrasjonspunkt (IP) API.
/// Ref: <see href="https://docs.digdir.no/eformidling_nm_restdocs.html"/>.
/// </summary>
/// <remarks>
/// A shipment is made of three calls in order: <see cref="CreateMessage"/> opens the message,
/// <see cref="UploadAttachment"/> adds each file, and <see cref="SendMessage"/> completes the
/// transaction. <see cref="GetMessageStatusById"/> reports on it afterwards.
/// <para>
/// Authentication is resolved by the client from the app's platform settings; callers supply no
/// headers. Every call throws <see cref="Helpers.PlatformHttpException"/> for a non-success response.
/// </para>
/// </remarks>
public interface IEFormidlingClient
{
    /// <summary>
    /// Creates a message from a Standard Business Document, which the integrasjonspunkt uses to route
    /// the shipment to its receivers. Creating a message also opens a conversation that tracks it.
    /// </summary>
    /// <param name="sbd">The document describing sender, receivers and shipment metadata.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    /// <returns>The document as the integrasjonspunkt recorded it.</returns>
    Task<StandardBusinessDocument> CreateMessage(
        StandardBusinessDocument sbd,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Uploads one attachment to a created message — a binary file, or the arkivmelding itself.
    /// </summary>
    /// <remarks>Filenames must be unique within a shipment; the integrasjonspunkt rejects duplicates.</remarks>
    /// <param name="attachment">The file content. Not disposed by this method.</param>
    /// <param name="messageId">The message id, matching the SBD's instance identifier.</param>
    /// <param name="filename">The name to give the file within the shipment.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    Task UploadAttachment(
        Stream attachment,
        string messageId,
        string filename,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends a created message, completing the transaction. Nothing leaves the outbox until this is
    /// called.
    /// </summary>
    /// <param name="messageId">The message id.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    Task SendMessage(string messageId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the statuses recorded for a message.
    /// </summary>
    /// <param name="messageId">The message id.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    /// <returns>
    /// The status page. A message that exists but has no statuses yet returns a page with an empty
    /// <see cref="Statuses.Content"/> rather than null.
    /// </returns>
    Task<Statuses> GetMessageStatusById(string messageId, CancellationToken cancellationToken = default);
}
