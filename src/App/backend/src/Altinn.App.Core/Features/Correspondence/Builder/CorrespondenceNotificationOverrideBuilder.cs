using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Builder factory for creating <see cref="CorrespondenceNotificationRecipient"/> objects.
/// </summary>
public class CorrespondenceNotificationOverrideBuilder : ICorrespondenceNotificationOverrideBuilder
{
    private string? _emailAddress;
    private string? _mobileNumber;
    private NationalIdentityNumber? _nationalIdentityNumber;
    private OrganisationNumber? _organizationNumber;

    private CorrespondenceNotificationOverrideBuilder() { }

    /// <summary>
    /// Creates a new <see cref="CorrespondenceNotificationOverrideBuilder"/> instance.
    /// </summary>
    public static ICorrespondenceNotificationOverrideBuilder Create() =>
        new CorrespondenceNotificationOverrideBuilder();

    /// <inheritdoc/>
    public ICorrespondenceNotificationOverrideBuilder WithEmailAddress(string? emailAddress)
    {
        _emailAddress = emailAddress;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationOverrideBuilder WithMobileNumber(string? mobileNumber)
    {
        _mobileNumber = mobileNumber;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationOverrideBuilder WithNationalIdentityNumber(
        NationalIdentityNumber? nationalIdentityNumber
    )
    {
        _nationalIdentityNumber = nationalIdentityNumber;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationOverrideBuilder WithOrganizationNumber(OrganisationNumber? organizationNumber)
    {
        _organizationNumber = organizationNumber;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationOverrideBuilder WithOrganisationOrPersonIdentifier(
        OrganisationOrPersonIdentifier? organisationOrPersonIdentifier
    )
    {
        if (organisationOrPersonIdentifier is OrganisationOrPersonIdentifier.Organisation org)
        {
            _organizationNumber = org.Value;
        }
        else if (organisationOrPersonIdentifier is OrganisationOrPersonIdentifier.Person person)
        {
            _nationalIdentityNumber = person.Value;
        }
        return this;
    }

    /// <inheritdoc/>
    public CorrespondenceNotificationRecipient Build()
    {
        if (_emailAddress is not null || _mobileNumber is not null)
        {
            return new CorrespondenceNotificationRecipient
            {
                EmailAddress = _emailAddress,
                MobileNumber = _mobileNumber,
            };
        }
        else if (_nationalIdentityNumber is not null)
        {
            return new CorrespondenceNotificationRecipient { NationalIdentityNumber = _nationalIdentityNumber };
        }
        else if (_organizationNumber is not null)
        {
            return new CorrespondenceNotificationRecipient { OrganizationNumber = _organizationNumber };
        }
        else
        {
            throw new CorrespondenceArgumentException(
                "At least one of EmailAddress, MobileNumber, NationalIdentityNumber, or OrganizationNumber must be provided."
            );
        }
    }
}
