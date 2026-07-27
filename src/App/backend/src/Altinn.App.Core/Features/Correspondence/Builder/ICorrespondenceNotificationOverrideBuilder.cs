using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Builder for creating <see cref="CorrespondenceNotification"/> objects with recipient overrides.
/// </summary>
public interface ICorrespondenceNotificationOverrideBuilder
{
    /// <summary>
    /// Sets the organization number override for the recipient.
    /// </summary>
    /// <param name="organizationNumber">The organization number to override</param>
    public ICorrespondenceNotificationOverrideBuilder WithOrganizationNumber(OrganisationNumber? organizationNumber);

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
    /// Sets the organisation or person identifier override for the recipient.
    /// </summary>
    /// <param name="organisationOrPersonIdentifier">The organization or person identifier</param>
    public ICorrespondenceNotificationOverrideBuilder WithOrganisationOrPersonIdentifier(
        OrganisationOrPersonIdentifier? organisationOrPersonIdentifier
    );

    /// <summary>
    /// Builds the <see cref="CorrespondenceNotificationRecipient"/> object.
    /// </summary>
    CorrespondenceNotificationRecipient Build();
}
