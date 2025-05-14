using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Recipients for the notification. If not set, the notification will be sent to the recipient of the Correspondence.
/// </summary>
public sealed record CorrespondenceNotificationRecipientWrapper : MultipartCorrespondenceListItem
{
    /// <summary>
    /// The correspondence recipient which the notification should be overridden for. Organization number or national identification number.
    /// </summary>
    public required OrganisationOrPersonIdentifier RecipientToOverride { get; init; }

    /// <summary>
    /// List of custom recipients to override the default recipient.
    /// </summary>
    public required List<CorrespondenceNotificationRecipient> CorrespondenceNotificationRecipients { get; init; }

    internal override void Serialise(MultipartFormDataContent content, int index)
    {
        AddRequired(
            content,
            RecipientToOverride.ToUrnFormattedString(),
            $"Correspondence.Notification.CustomNotificationRecipients[{index}].RecipientToOverride"
        );
        SerializeOverrideNotificationRecipients(content, CorrespondenceNotificationRecipients, index);
    }
}
