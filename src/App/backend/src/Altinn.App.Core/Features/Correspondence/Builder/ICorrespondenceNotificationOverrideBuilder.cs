using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Builder for creating <see cref="CorrespondenceNotification"/> objects with recipient overrides.
/// </summary>
[Obsolete("This builder is deprecated and will be removed in a future version.")]
public interface ICorrespondenceNotificationOverrideBuilder
{
    /// <summary>
    /// Sets the recipient to override for the correspondence notification.
    /// </summary>
    /// <param name="identifierAsString">The recipient to override notifications for. Organization number / national identifier</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(string identifierAsString);

    /// <summary>
    /// Sets the recipient to override for the correspondence notification.
    /// </summary>
    /// <param name="organizationNumber">The recipient to override notifications for.</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(OrganisationNumber organizationNumber);

    /// <summary>
    /// Sets the recipient to override for the correspondence notification.
    /// </summary>
    /// <param name="nin">The recipient to override notifications for.</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(NationalIdentityNumber nin);

    /// <summary>
    /// Sets the recipient to override for the correspondence notification.
    /// </summary>
    /// <param name="identifier">The recipient to override notifications for.</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(
        OrganisationOrPersonIdentifier identifier
    );

    /// <summary>
    /// Sets the custom recipients to override the default recipient.
    /// </summary>
    /// <remarks> Only the first recipient in the list will be used for sending the notification. </remarks>
    /// <param name="correspondenceNotificationRecipients">The custom recipients</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithCorrespondenceNotificationRecipients(
        List<CorrespondenceNotificationRecipient> correspondenceNotificationRecipients
    );

    /// <summary>
    /// Sets the organization number override for the recipient.
    /// </summary>
    /// <param name="organizationNumber">The organization number to override</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithOrganizationNumber(OrganisationNumber? organizationNumber);

    /// <summary>
    /// Sets the national identity number override for the recipient.
    /// </summary>
    /// <param name="nationalIdentityNumber">The national identity number to override</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithNationalIdentityNumber(
        NationalIdentityNumber? nationalIdentityNumber
    );

    /// <summary>
    /// Sets the email override for the recipient.
    /// </summary>
    /// <param name="emailAddress">The email address to override</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithEmailAddress(string? emailAddress);

    /// <summary>
    /// Sets the mobile number override for the recipient.
    /// </summary>
    /// <param name="mobileNumber">The mobile number to override</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithMobileNumber(string? mobileNumber);

    /// <summary>
    /// Sets the organisation or person identifier override for the recipient.
    /// </summary>
    /// <param name="organisationOrPersonIdentifier">The organization or person identifier</param>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public ICorrespondenceNotificationOverrideBuilder WithOrganisationOrPersonIdentifier(
        OrganisationOrPersonIdentifier? organisationOrPersonIdentifier
    );

    /// <summary>
    /// Builds the <see cref="CorrespondenceNotificationRecipient"/> object.
    /// </summary>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    CorrespondenceNotificationRecipient Build();
}
