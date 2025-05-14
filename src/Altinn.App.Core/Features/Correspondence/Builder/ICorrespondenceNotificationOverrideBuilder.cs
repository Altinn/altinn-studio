using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Builder for creating <see cref="CorrespondenceNotification"/> objects with recipient overrides.
/// </summary>
public interface ICorrespondenceNotificationOverrideBuilder
{
    /// <summary>
    /// Sets the recipient to override for the correspondence notification.
    /// </summary>
    /// <param name="recipientToOverride">The recipient to override notifications for. Organization number / national identifier</param>
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(string recipientToOverride);

    /// <summary>
    /// Sets the recipient to override for the correspondence notification.
    /// </summary>
    /// <param name="recipientToOverride">The recipient to override notifications for.</param>
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(OrganisationNumber recipientToOverride);

    /// <summary>
    /// Sets the recipient to override for the correspondence notification.
    /// </summary>
    /// <param name="recipientToOverride">The recipient to override notifications for.</param>
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(
        NationalIdentityNumber recipientToOverride
    );

    /// <summary>
    /// Sets the recipient to override for the correspondence notification.
    /// </summary>
    /// <param name="recipientToOverride">The recipient to override notifications for.</param>
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(
        OrganisationOrPersonIdentifier recipientToOverride
    );

    /// <summary>
    /// Sets the custom recipients to override the default recipient.
    /// </summary>
    /// <param name="correspondenceNotificationRecipients">The custom recipients</param>
    public ICorrespondenceNotificationOverrideBuilder WithCorrespondenceNotificationRecipients(
        List<CorrespondenceNotificationRecipient> correspondenceNotificationRecipients
    );

    /// <summary>
    /// Builds the <see cref="CorrespondenceNotificationRecipientWrapper"/> object.
    /// </summary>
    CorrespondenceNotificationRecipientWrapper Build();
}
