using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Recipients for the notification. If not set, the notification will be sent to the recipient of the Correspondence.
/// </summary>
[Obsolete(
    "This model is deprecated and will be removed in a future version. Use CorrespondenceNotificationRecipient instead."
)]
public sealed record CorrespondenceNotificationRecipientWrapper : MultipartCorrespondenceListItem
{
    /// <summary>
    /// The correspondence recipient which the notification should be overridden for. Organization number or national identification number.
    /// </summary>
    public required OrganisationOrPersonIdentifier RecipientToOverride { get; init; }

    /// <summary>
    /// List of custom recipients to override the default recipient.
    /// </summary>
    /// <remarks> Only the first recipient in the list will be used for sending the notification. </remarks>
    public required List<CorrespondenceNotificationRecipient> CorrespondenceNotificationRecipients { get; init; }

    internal override void Serialise(MultipartFormDataContent content, int index)
    {
        SerializeOverrideNotificationRecipients(content, CorrespondenceNotificationRecipients);
    }
}
