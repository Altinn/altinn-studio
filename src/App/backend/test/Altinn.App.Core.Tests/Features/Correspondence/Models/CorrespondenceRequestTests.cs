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
            SendersReference = "senders-reference",
            Recipients =
            [
                OrganizationOrPersonIdentifier.Create(TestHelpers.GetOrganizationNumber(1)),
                OrganizationOrPersonIdentifier.Create(TestHelpers.GetOrganizationNumber(1)),
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
            SendersReference = "senders-reference",
            IsConfirmationNeeded = true,
            Recipients = [OrganizationOrPersonIdentifier.Create(TestHelpers.GetOrganizationNumber(1))],
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
            SendersReference = "senders-reference",
            Recipients = [OrganizationOrPersonIdentifier.Create(TestHelpers.GetOrganizationNumber(1))],
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
            SendersReference = "senders-reference",
            RequestedPublishTime = DateTimeOffset.Now.AddDays(2),
            Recipients = [OrganizationOrPersonIdentifier.Create(TestHelpers.GetOrganizationNumber(1))],
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

    [Fact]
    public void Validate_RejectsOverrideRegisteredContactInformationWithoutCustomRecipients()
    {
        // Arrange
        CorrespondenceRequest Build(IReadOnlyList<CorrespondenceNotificationRecipient>? customRecipients) =>
            new()
            {
                ResourceId = "resource-id",
                SendersReference = "senders-reference",
                Recipients = [OrganizationOrPersonIdentifier.Create(TestHelpers.GetOrganizationNumber(1))],
                Content = new CorrespondenceContent
                {
                    Title = "title",
                    Body = "body",
                    Summary = "summary",
                    Language = LanguageCode<Iso6391>.Parse("no"),
                },
                Notification = new CorrespondenceNotification
                {
                    NotificationTemplate = CorrespondenceNotificationTemplate.GenericAltinnMessage,
                    OverrideRegisteredContactInformation = true,
                    CustomRecipients = customRecipients,
                },
            };

        // Act
        var withNone = () => Build(null).Validate();
        var withEmpty = () => Build([]).Validate();
        var withOne = () =>
            Build([new CorrespondenceNotificationRecipient { EmailAddress = "a@example.com" }]).Validate();

        // Assert
        withNone.Should().Throw<CorrespondenceArgumentException>().WithMessage("*CustomRecipients*");
        withEmpty.Should().Throw<CorrespondenceArgumentException>().WithMessage("*CustomRecipients*");
        withOne.Should().NotThrow();
    }

    [Fact]
    public void Validate_RejectsUnusableIdempotentKeys()
    {
        // Arrange
        CorrespondenceRequest Build(Guid? key, int recipientCount) =>
            new()
            {
                ResourceId = "resource-id",
                SendersReference = "senders-reference",
                Recipients = Enumerable
                    .Range(1, recipientCount)
                    .Select(i => OrganizationOrPersonIdentifier.Create(TestHelpers.GetOrganizationNumber(i)))
                    .ToList(),
                Content = new CorrespondenceContent
                {
                    Title = "title",
                    Body = "body",
                    Summary = "summary",
                    Language = LanguageCode<Iso6391>.Parse("no"),
                },
                IdempotentKey = key,
            };

        // Act
        var empty = () => Build(Guid.Empty, 1).Validate();
        var manyRecipients = () => Build(Guid.NewGuid(), 2).Validate();
        var valid = () => Build(Guid.NewGuid(), 1).Validate();
        var noKeyManyRecipients = () => Build(null, 2).Validate();

        // Assert: the API rejects both of these, so they must fail before the request is sent
        empty.Should().Throw<CorrespondenceArgumentException>().WithMessage("*empty GUID*");
        manyRecipients.Should().Throw<CorrespondenceArgumentException>().WithMessage("*more than one recipient*");
        valid.Should().NotThrow();
        noKeyManyRecipients.Should().NotThrow();
    }
}
