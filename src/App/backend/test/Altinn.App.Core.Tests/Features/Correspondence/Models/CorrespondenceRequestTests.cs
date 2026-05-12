using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Correspondence.Models;

public class CorrespondenceRequestTests
{
    [Fact]
    public void Validate_ValidatesUniqueRecipients()
    {
        // Arrange
        var correspondence = new CorrespondenceRequest
        {
            ResourceId = "resource-id",
            Sender = TestHelpers.GetOrganisationNumber(0),
            SendersReference = "senders-reference",
            Recipients =
            [
                OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1)),
                OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1)),
            ],
            Content = new CorrespondenceContent
            {
                Title = "title",
                Body = "body",
                Summary = "summary",
                Language = LanguageCode<Iso6391>.Parse("no"),
            },
        };

        // Act
        var act = () => correspondence.Validate();

        // Assert
        act.Should().Throw<CorrespondenceArgumentException>().WithMessage("Duplicate recipients found *");
    }

    [Fact]
    public void Validate_ValidatesConfirmationAndDueDate()
    {
        // Arrange
        var correspondence = new CorrespondenceRequest
        {
            ResourceId = "resource-id",
            Sender = TestHelpers.GetOrganisationNumber(0),
            SendersReference = "senders-reference",
            IsConfirmationNeeded = true,
            Recipients = [OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1))],
            Content = new CorrespondenceContent
            {
                Title = "title",
                Body = "body",
                Summary = "summary",
                Language = LanguageCode<Iso6391>.Parse("no"),
            },
        };

        // Act
        var act = () => correspondence.Validate();

        // Assert
        act.Should().Throw<CorrespondenceArgumentException>().WithMessage("When*set*required");
    }

    [Fact]
    public void Validate_ValidatesNoDatesInThePast()
    {
        // Arrange
        var baseCorrespondence = new CorrespondenceRequest
        {
            ResourceId = "resource-id",
            Sender = TestHelpers.GetOrganisationNumber(0),
            SendersReference = "senders-reference",
            Recipients = [OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1))],
            Content = new CorrespondenceContent
            {
                Title = "title",
                Body = "body",
                Summary = "summary",
                Language = LanguageCode<Iso6391>.Parse("no"),
            },
        };

        // Act
        var act = () =>
        {
            var correspondence = baseCorrespondence with { DueDateTime = DateTimeOffset.Now.AddSeconds(-1) };
            correspondence.Validate();
        };

        // Assert
        act.Should().Throw<CorrespondenceArgumentException>().WithMessage("*not be*in the past");
    }

    [Fact]
    public void Validate_ValidatesNoBeforePublishDate()
    {
        // Arrange
        var baseCorrespondence = new CorrespondenceRequest
        {
            ResourceId = "resource-id",
            Sender = TestHelpers.GetOrganisationNumber(0),
            SendersReference = "senders-reference",
            RequestedPublishTime = DateTimeOffset.Now.AddDays(2),
            Recipients = [OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1))],
            Content = new CorrespondenceContent
            {
                Title = "title",
                Body = "body",
                Summary = "summary",
                Language = LanguageCode<Iso6391>.Parse("no"),
            },
        };

        // Act
        var act = () =>
        {
            var correspondence = baseCorrespondence with { DueDateTime = DateTimeOffset.Now.AddDays(1) };
            correspondence.Validate();
        };

        // Assert
        act.Should().Throw<CorrespondenceArgumentException>().WithMessage("*not be prior to*");
    }
}
