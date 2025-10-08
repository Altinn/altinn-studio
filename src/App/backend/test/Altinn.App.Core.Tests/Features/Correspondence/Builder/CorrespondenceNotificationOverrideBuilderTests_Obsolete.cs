using Altinn.App.Core.Features.Correspondence.Builder;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Correspondence.Builder;

public class CorrespondenceNotificationOverrideBuilderTests_Obsolete
{
    [Fact]
    public void WithRecipientToOverride_WithOrganizationNumberString_ShouldSetOrganizationNumber()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);
        var organizationNumberString = organizationNumber.ToString();

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithRecipientToOverride(organizationNumberString);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.OrganizationNumber.Should().Be(organizationNumber);
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void WithRecipientToOverride_WithNationalIdentityNumberString_ShouldSetNationalIdentityNumber()
    {
        // Arrange
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);
        var nationalIdentityNumberString = nationalIdentityNumber.Value;

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithRecipientToOverride(nationalIdentityNumberString);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.NationalIdentityNumber.Should().Be(nationalIdentityNumber);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void WithRecipientToOverride_WithInvalidString_ShouldThrowCorrespondenceArgumentException()
    {
        // Arrange
        var invalidIdentifier = "invalid-identifier";

        var builder = CorrespondenceNotificationOverrideBuilder.Create();

        // Act
        var act = () => builder.WithRecipientToOverride(invalidIdentifier);

        // Assert
        act.Should()
            .Throw<CorrespondenceArgumentException>()
            .WithMessage("Failed to parse identifier, invalid format.");
    }

    [Fact]
    public void WithRecipientToOverride_WithWhiteSpace_ShouldThrowCorrespondenceArgumentException()
    {
        // Arrange
        var invalidIdentifier = "   ";

        var builder = CorrespondenceNotificationOverrideBuilder.Create();

        // Act
        var act = () => builder.WithRecipientToOverride(invalidIdentifier);

        // Assert
        act.Should()
            .Throw<CorrespondenceArgumentException>()
            .WithMessage("Failed to parse identifier, null or empty value.");
    }

    [Fact]
    public void WithRecipientToOverride_WithOrganizationNumberObject_ShouldSetOrganizationNumber()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);

        var builder = CorrespondenceNotificationOverrideBuilder.Create().WithRecipientToOverride(organizationNumber);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.OrganizationNumber.Should().Be(organizationNumber);
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void WithRecipientToOverride_WithNationalIdentityNumberObject_ShouldSetNationalIdentityNumber()
    {
        // Arrange
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithRecipientToOverride(nationalIdentityNumber);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.NationalIdentityNumber.Should().Be(nationalIdentityNumber);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void WithRecipientToOverride_WithOrganisationOrPersonIdentifier_Organisation_ShouldSetOrganizationNumber()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);
        var organisationIdentifier = OrganisationOrPersonIdentifier.Create(organizationNumber);

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithRecipientToOverride(organisationIdentifier);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.OrganizationNumber.Should().Be(organizationNumber);
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void WithRecipientToOverride_WithOrganisationOrPersonIdentifier_Person_ShouldSetNationalIdentityNumber()
    {
        // Arrange
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);
        var personIdentifier = OrganisationOrPersonIdentifier.Create(nationalIdentityNumber);

        var builder = CorrespondenceNotificationOverrideBuilder.Create().WithRecipientToOverride(personIdentifier);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.NationalIdentityNumber.Should().Be(nationalIdentityNumber);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void WithCorrespondenceNotificationRecipients_WithValidList_ShouldSetFirstRecipientProperties()
    {
        // Arrange
        var emailAddress = "test@example.com";
        var mobileNumber = "12345678";
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);

        var recipients = new List<CorrespondenceNotificationRecipient>
        {
            new CorrespondenceNotificationRecipient
            {
                EmailAddress = emailAddress,
                MobileNumber = mobileNumber,
                NationalIdentityNumber = nationalIdentityNumber,
                OrganizationNumber = organizationNumber,
            },
            new CorrespondenceNotificationRecipient { EmailAddress = "second@example.com", MobileNumber = "87654321" },
        };

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithCorrespondenceNotificationRecipients(recipients);

        // Act
        var recipient = builder.Build();

        // Assert - Should use contact info from first recipient (email/mobile take precedence)
        recipient.Should().NotBeNull();
        recipient.EmailAddress.Should().Be(emailAddress);
        recipient.MobileNumber.Should().Be(mobileNumber);
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.OrganizationNumber.Should().BeNull();
    }

    [Fact]
    public void WithCorrespondenceNotificationRecipients_WithFirstRecipientHavingOnlyOrganizationNumber_ShouldSetOrganizationNumber()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);

        var recipients = new List<CorrespondenceNotificationRecipient>
        {
            new CorrespondenceNotificationRecipient { OrganizationNumber = organizationNumber },
        };

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithCorrespondenceNotificationRecipients(recipients);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.OrganizationNumber.Should().Be(organizationNumber);
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void WithCorrespondenceNotificationRecipients_WithFirstRecipientHavingOnlyNationalIdentityNumber_ShouldSetNationalIdentityNumber()
    {
        // Arrange
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);

        var recipients = new List<CorrespondenceNotificationRecipient>
        {
            new CorrespondenceNotificationRecipient { NationalIdentityNumber = nationalIdentityNumber },
        };

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithCorrespondenceNotificationRecipients(recipients);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.NationalIdentityNumber.Should().Be(nationalIdentityNumber);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void WithCorrespondenceNotificationRecipients_WithEmptyList_ShouldThrowCorrespondenceArgumentException()
    {
        // Arrange
        var emptyRecipients = new List<CorrespondenceNotificationRecipient>();

        var builder = CorrespondenceNotificationOverrideBuilder.Create();

        // Act
        var act = () => builder.WithCorrespondenceNotificationRecipients(emptyRecipients);

        // Assert
        act.Should().Throw<CorrespondenceArgumentException>().WithMessage("At least one recipient must be provided.");
    }

    [Fact]
    public void WithCorrespondenceNotificationRecipients_WithNullList_ShouldThrowArgumentNullException()
    {
        // Arrange
        List<CorrespondenceNotificationRecipient> nullRecipients = null!;

        var builder = CorrespondenceNotificationOverrideBuilder.Create();

        // Act
        var act = () => builder.WithCorrespondenceNotificationRecipients(nullRecipients);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void WithCorrespondenceNotificationRecipients_WithFirstRecipientHavingNullProperties_ShouldThrowWhenBuilding()
    {
        // Arrange
        var recipients = new List<CorrespondenceNotificationRecipient>
        {
            new CorrespondenceNotificationRecipient
            {
                EmailAddress = null,
                MobileNumber = null,
                NationalIdentityNumber = null,
                OrganizationNumber = null,
            },
        };

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithCorrespondenceNotificationRecipients(recipients);

        // Act
        var act = () => builder.Build();

        // Assert
        act.Should()
            .Throw<CorrespondenceArgumentException>()
            .WithMessage(
                "At least one of EmailAddress, MobileNumber, NationalIdentityNumber, or OrganizationNumber must be provided."
            );
    }

    [Fact]
    public void ObsoleteMethods_ShouldWorkWithMethodChaining()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);
        var emailAddress = "chain@example.com";

        // Act
        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithRecipientToOverride(organizationNumber)
            .WithEmailAddress(emailAddress);

        var recipient = builder.Build();

        // Assert - Email should take precedence over organization number
        recipient.Should().NotBeNull();
        recipient.EmailAddress.Should().Be(emailAddress);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }
}
