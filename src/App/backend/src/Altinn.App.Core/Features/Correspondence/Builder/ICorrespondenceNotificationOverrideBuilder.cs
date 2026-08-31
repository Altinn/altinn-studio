using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Builder for a single additional <see cref="CorrespondenceNotificationRecipient"/>, to be passed to
/// <see cref="ICorrespondenceNotificationBuilder.WithRecipientOverride(ICorrespondenceNotificationOverrideBuilder)"/>.
/// </summary>
/// <remarks>Exactly one of the four contact channels decides the recipient; see
/// <see cref="Build"/> for the precedence between them. The resulting recipient is notified in addition
/// to the correspondence recipient, not instead of it — see
/// <see cref="CorrespondenceNotification.CustomRecipients"/>.</remarks>
public interface ICorrespondenceNotificationOverrideBuilder
{
    /// <summary>
    /// Sets the organization number override for the recipient.
    /// </summary>
    /// <param name="organizationNumber">The organization number to override</param>
    public ICorrespondenceNotificationOverrideBuilder WithOrganizationNumber(OrganizationNumber? organizationNumber);

    /// <summary>
    /// Sets the national identity number override for the recipient.
    /// </summary>
    /// <param name="nationalIdentityNumber">The national identity number to override</param>
    public ICorrespondenceNotificationOverrideBuilder WithNationalIdentityNumber(
        NationalIdentityNumber? nationalIdentityNumber
    );

    /// <summary>
    /// Sets the email override for the recipient.
    /// </summary>
    /// <param name="emailAddress">The email address to override</param>
    public ICorrespondenceNotificationOverrideBuilder WithEmailAddress(string? emailAddress);

    /// <summary>
    /// Sets the mobile number override for the recipient.
    /// </summary>
    /// <param name="mobileNumber">The mobile number to override</param>
    public ICorrespondenceNotificationOverrideBuilder WithMobileNumber(string? mobileNumber);

    /// <summary>
    /// Sets the organization or person identifier override for the recipient.
    /// </summary>
    /// <param name="organizationOrPersonIdentifier">The organization or person identifier</param>
    public ICorrespondenceNotificationOverrideBuilder WithOrganizationOrPersonIdentifier(
        OrganizationOrPersonIdentifier? organizationOrPersonIdentifier
    );

    /// <summary>
    /// Builds the <see cref="CorrespondenceNotificationRecipient"/> object.
    /// </summary>
    CorrespondenceNotificationRecipient Build();
}
