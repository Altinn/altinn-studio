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
    [Obsolete(
        "This method is deprecated and will be removed in a future version. Use WithOrganizationNumber/WithNationalIdentityNumber/WithEmailAddress/WithMobileNumber instead."
    )]
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(string identifierAsString)
    {
        OrganisationOrPersonIdentifier identifier;

        try
        {
            identifier = OrganisationOrPersonIdentifier.Parse(identifierAsString);
        }
        catch (FormatException ex)
        {
            throw new CorrespondenceArgumentException("Failed to parse identifier, invalid format.", ex);
        }
        catch (ArgumentException ex)
        {
            throw new CorrespondenceArgumentException("Failed to parse identifier, null or empty value.", ex);
        }

        return identifier switch
        {
            OrganisationOrPersonIdentifier.Organisation organizationNumber => WithOrganizationNumber(
                organizationNumber
            ),
            OrganisationOrPersonIdentifier.Person nathionalIdentityNumber => WithNationalIdentityNumber(
                nathionalIdentityNumber
            ),
            _ => throw new CorrespondenceArgumentException(
                "Parse succeeded, but identifier is neither an organization nor a person."
            ),
        };
    }

    /// <inheritdoc/>
    [Obsolete(
        "This method is deprecated and will be removed in a future version. Use WithOrganizationNumber/WithNationalIdentityNumber/WithEmailAddress/WithMobileNumber instead."
    )]
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(OrganisationNumber organizationNumber)
    {
        return WithOrganizationNumber(organizationNumber);
    }

    /// <inheritdoc/>
    [Obsolete(
        "This method is deprecated and will be removed in a future version. Use WithOrganizationNumber/WithNationalIdentityNumber/WithEmailAddress/WithMobileNumber instead."
    )]
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(NationalIdentityNumber nin)
    {
        return WithNationalIdentityNumber(nin);
    }

    /// <inheritdoc/>
    [Obsolete(
        "This method is deprecated and will be removed in a future version. Use WithOrganizationNumber/WithNationalIdentityNumber/WithEmailAddress/WithMobileNumber instead."
    )]
    public ICorrespondenceNotificationOverrideBuilder WithRecipientToOverride(OrganisationOrPersonIdentifier identifier)
    {
        return identifier switch
        {
            OrganisationOrPersonIdentifier.Organisation org => WithOrganizationNumber(org),
            OrganisationOrPersonIdentifier.Person person => WithNationalIdentityNumber(person),
            _ => throw new CorrespondenceArgumentException(
                "Recipient identifier must be either an organization or a person."
            ),
        };
    }

    /// <inheritdoc/>
    [Obsolete(
        "This method is deprecated and will be removed in a future version. Use WithOrganizationNumber/WithNationalIdentityNumber/WithEmailAddress/WithMobileNumber instead."
    )]
    public ICorrespondenceNotificationOverrideBuilder WithCorrespondenceNotificationRecipients(
        List<CorrespondenceNotificationRecipient> correspondenceNotificationRecipients
    )
    {
        var firstRecipient =
            correspondenceNotificationRecipients.FirstOrDefault()
            ?? throw new CorrespondenceArgumentException("At least one recipient must be provided.");

        _emailAddress = firstRecipient.EmailAddress;
        _mobileNumber = firstRecipient.MobileNumber;
        _nationalIdentityNumber = firstRecipient.NationalIdentityNumber;
        _organizationNumber = firstRecipient.OrganizationNumber;
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
