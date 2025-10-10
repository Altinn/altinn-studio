using Altinn.App.Core.Features.Correspondence.Builder;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Correspondence.Builder;

public class CorrespondenceNotificationOverrideBuilderTests
{
    [Fact]
    public void Build_WithOnlyOrganizationNumber_ShouldReturnValidRecipient()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);

        var builder = CorrespondenceNotificationOverrideBuilder.Create().WithOrganizationNumber(organizationNumber);

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
    public void Build_WithOnlyNationalIdentityNumber_ShouldReturnValidRecipient()
    {
        // Arrange
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithNationalIdentityNumber(nationalIdentityNumber);

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
    public void Build_WithOnlyEmailAddress_ShouldReturnValidRecipient()
    {
        // Arrange
        var emailAddress = "test@example.com";

        var builder = CorrespondenceNotificationOverrideBuilder.Create().WithEmailAddress(emailAddress);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.EmailAddress.Should().Be(emailAddress);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void Build_WithOnlyMobileNumber_ShouldReturnValidRecipient()
    {
        // Arrange
        var mobileNumber = "12345678";

        var builder = CorrespondenceNotificationOverrideBuilder.Create().WithMobileNumber(mobileNumber);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.MobileNumber.Should().Be(mobileNumber);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
    }

    [Fact]
    public void Build_WithEmailAndMobileNumber_ShouldReturnValidRecipient()
    {
        // Arrange
        var emailAddress = "test@example.com";
        var mobileNumber = "87654321";

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithEmailAddress(emailAddress)
            .WithMobileNumber(mobileNumber);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.EmailAddress.Should().Be(emailAddress);
        recipient.MobileNumber.Should().Be(mobileNumber);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
    }

    [Fact]
    public void Build_WithOrganisationOrPersonIdentifier_Organisation_ShouldSetOnlyOrganizationNumber()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);
        var organisationIdentifier = OrganisationOrPersonIdentifier.Create(organizationNumber);

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithOrganisationOrPersonIdentifier(organisationIdentifier);

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
    public void Build_WithOrganisationOrPersonIdentifier_Person_ShouldSetOnlyNationalIdentityNumber()
    {
        // Arrange
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);
        var personIdentifier = OrganisationOrPersonIdentifier.Create(nationalIdentityNumber);

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithOrganisationOrPersonIdentifier(personIdentifier);

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
    public void Build_WithOrganisationOrPersonIdentifier_Null_ShouldNotSetIdentifiers()
    {
        // Arrange
        var emailAddress = "null@example.com";

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithOrganisationOrPersonIdentifier(null)
            .WithEmailAddress(emailAddress);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.EmailAddress.Should().Be(emailAddress);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void Builder_UpdatesAndOverwritesValuesCorrectly()
    {
        // Arrange
        var initialOrgNumber = TestHelpers.GetOrganisationNumber(1);
        var updatedOrgNumber = TestHelpers.GetOrganisationNumber(2);
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);
        var emailAddress = "updated@example.com";

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithOrganizationNumber(initialOrgNumber)
            .WithOrganizationNumber(updatedOrgNumber)
            .WithNationalIdentityNumber(nationalIdentityNumber)
            .WithNationalIdentityNumber(null)
            .WithEmailAddress(emailAddress);

        // Act
        var recipient = builder.Build();

        // Assert - Contact info takes precedence, so identifiers are ignored
        recipient.Should().NotBeNull();
        recipient.EmailAddress.Should().Be(emailAddress);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void Build_WithContactInfoTakesPrecedenceOverOrganizationNumber()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);
        var emailAddress = "precedence@example.com";

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithOrganizationNumber(organizationNumber)
            .WithEmailAddress(emailAddress);

        // Act
        var recipient = builder.Build();

        // Assert - Contact info should take precedence
        recipient.Should().NotBeNull();
        recipient.EmailAddress.Should().Be(emailAddress);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void Build_WithContactInfoTakesPrecedenceOverNationalIdentityNumber()
    {
        // Arrange
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);
        var mobileNumber = "12345678";

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithNationalIdentityNumber(nationalIdentityNumber)
            .WithMobileNumber(mobileNumber);

        // Act
        var recipient = builder.Build();

        // Assert - Contact info should take precedence
        recipient.Should().NotBeNull();
        recipient.MobileNumber.Should().Be(mobileNumber);
        recipient.NationalIdentityNumber.Should().BeNull();
        recipient.OrganizationNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
    }

    [Fact]
    public void Build_WithContactInfoTakesPrecedenceOverBothIdentifiers()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);
        var emailAddress = "precedence@example.com";
        var mobileNumber = "87654321";

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithOrganizationNumber(organizationNumber)
            .WithNationalIdentityNumber(nationalIdentityNumber)
            .WithEmailAddress(emailAddress)
            .WithMobileNumber(mobileNumber);

        // Act
        var recipient = builder.Build();

        // Assert - Contact info should take precedence
        recipient.Should().NotBeNull();
        recipient.EmailAddress.Should().Be(emailAddress);
        recipient.MobileNumber.Should().Be(mobileNumber);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
    }

    [Fact]
    public void Build_WithNationalIdentityNumberTakesPrecedenceOverOrganizationNumber()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);
        var nationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(1);

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithOrganizationNumber(organizationNumber)
            .WithNationalIdentityNumber(nationalIdentityNumber);

        // Act
        var recipient = builder.Build();

        // Assert - National identity number should take precedence
        recipient.Should().NotBeNull();
        recipient.NationalIdentityNumber.Should().Be(nationalIdentityNumber);
        recipient.OrganizationNumber.Should().BeNull();
        recipient.EmailAddress.Should().BeNull();
        recipient.MobileNumber.Should().BeNull();
    }

    [Fact]
    public void Build_WithNoInformation_ShouldThrowCorrespondenceArgumentException()
    {
        // Arrange
        var builder = CorrespondenceNotificationOverrideBuilder.Create();

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
    public void Build_WithNullContactInformation_AndNoIdentifiers_ShouldThrowCorrespondenceArgumentException()
    {
        // Arrange
        var builder = CorrespondenceNotificationOverrideBuilder.Create().WithEmailAddress(null).WithMobileNumber(null);

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
    public void Build_WithNullEmailButValidMobile_ShouldReturnValidRecipient()
    {
        // Arrange
        var mobileNumber = "12345678";

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithEmailAddress(null)
            .WithMobileNumber(mobileNumber);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.MobileNumber.Should().Be(mobileNumber);
        recipient.EmailAddress.Should().BeNull();
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
    }

    [Fact]
    public void Build_WithValidEmailButNullMobile_ShouldReturnValidRecipient()
    {
        // Arrange
        var emailAddress = "test@example.com";

        var builder = CorrespondenceNotificationOverrideBuilder
            .Create()
            .WithEmailAddress(emailAddress)
            .WithMobileNumber(null);

        // Act
        var recipient = builder.Build();

        // Assert
        recipient.Should().NotBeNull();
        recipient.EmailAddress.Should().Be(emailAddress);
        recipient.MobileNumber.Should().BeNull();
        recipient.OrganizationNumber.Should().BeNull();
        recipient.NationalIdentityNumber.Should().BeNull();
    }

    [Fact]
    public void Create_ShouldReturnNewBuilderInstance()
    {
        // Act
        var builder1 = CorrespondenceNotificationOverrideBuilder.Create();
        var builder2 = CorrespondenceNotificationOverrideBuilder.Create();

        // Assert
        builder1.Should().NotBeNull();
        builder2.Should().NotBeNull();
        builder1.Should().NotBeSameAs(builder2);
    }

    [Fact]
    public void Builder_MethodChaining_ShouldReturnSameBuilderInstance()
    {
        // Arrange
        var organizationNumber = TestHelpers.GetOrganisationNumber(1);

        // Act
        var builder = CorrespondenceNotificationOverrideBuilder.Create();
        var chainedBuilder = builder.WithOrganizationNumber(organizationNumber);

        // Assert
        builder.Should().BeSameAs(chainedBuilder);
    }
}
