using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Correspondence.Models;

[Obsolete(
    "This test class test an obsolete member of the CorrespondenceRequest class. Delete this test class when the CustomNotificationRecipients property is removed from the CorrespondenceRequest class."
)]
public class CorrespondenceRequestTests_Obsolete
{
    [Fact]
    public async Task Serialise_ShouldAddCorrectFields()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent();
        var correspondence = new CorrespondenceRequest
        {
            ResourceId = "resource-id",
            Sender = TestHelpers.GetOrganisationNumber(0),
            SendersReference = "senders-reference",
            RequestedPublishTime = DateTimeOffset.UtcNow.AddDays(1),
            AllowSystemDeleteAfter = DateTimeOffset.UtcNow.AddDays(2),
            DueDateTime = DateTimeOffset.UtcNow.AddDays(2),
            IgnoreReservation = true,
            IsConfirmationNeeded = true,
            MessageSender = "message-sender",
            Recipients =
            [
                OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1)),
                OrganisationOrPersonIdentifier.Create(TestHelpers.GetNationalIdentityNumber(1)),
            ],
            Content = new CorrespondenceContent
            {
                Title = "title",
                Body = "body",
                Summary = "summary",
                Language = LanguageCode<Iso6391>.Parse("no"),
                Attachments =
                [
                    new CorrespondenceAttachment
                    {
                        Filename = "filename-1",
                        SendersReference = "senders-reference-1",
                        Data = "data"u8.ToArray(),
                    },
                    new CorrespondenceAttachment
                    {
                        Filename = "filename-2",
                        SendersReference = "senders-reference-2",
                        Data = "data"u8.ToArray(),
                        DataLocationType = CorrespondenceDataLocationType.NewCorrespondenceAttachment,
                        IsEncrypted = true,
                    },
                ],
            },
            ExternalReferences =
            [
                new CorrespondenceExternalReference
                {
                    ReferenceType = CorrespondenceReferenceType.AltinnAppInstance,
                    ReferenceValue = "reference-1",
                },
                new CorrespondenceExternalReference
                {
                    ReferenceType = CorrespondenceReferenceType.AltinnBrokerFileTransfer,
                    ReferenceValue = "reference-2",
                },
                new CorrespondenceExternalReference
                {
                    ReferenceType = CorrespondenceReferenceType.DialogportenDialogId,
                    ReferenceValue = "reference-3",
                },
                new CorrespondenceExternalReference
                {
                    ReferenceType = CorrespondenceReferenceType.DialogportenProcessId,
                    ReferenceValue = "reference-4",
                },
                new CorrespondenceExternalReference
                {
                    ReferenceType = CorrespondenceReferenceType.Generic,
                    ReferenceValue = "reference-5",
                },
            ],
            PropertyList = new Dictionary<string, string> { { "key-1", "value-1" }, { "key-2", "value-2" } },
            ReplyOptions =
            [
                new CorrespondenceReplyOption { LinkUrl = "link-url-1", LinkText = "link-text-1" },
                new CorrespondenceReplyOption { LinkUrl = "link-url-2", LinkText = "link-text-2" },
            ],
            Notification = new CorrespondenceNotification
            {
                NotificationTemplate = CorrespondenceNotificationTemplate.CustomMessage,
                EmailSubject = "email-subject",
                EmailBody = "email-body",
                SmsBody = "sms-body",
                SendReminder = true,
                ReminderEmailSubject = "reminder-email-subject",
                ReminderEmailBody = "reminder-email-body",
                ReminderSmsBody = "reminder-sms-body",
                NotificationChannel = CorrespondenceNotificationChannel.EmailPreferred,
                ReminderNotificationChannel = CorrespondenceNotificationChannel.SmsPreferred,
                SendersReference = "senders-reference",
                RequestedSendTime = DateTimeOffset.UtcNow,
                CustomNotificationRecipients =
                [
                    new CorrespondenceNotificationRecipientWrapper()
                    {
                        RecipientToOverride = OrganisationOrPersonIdentifier.Create(
                            TestHelpers.GetNationalIdentityNumber(2)
                        ),
                        CorrespondenceNotificationRecipients =
                        [
                            new CorrespondenceNotificationRecipient
                            {
                                EmailAddress = "email-address-1",
                                OrganizationNumber = TestHelpers.GetOrganisationNumber(0),
                            },
                            new CorrespondenceNotificationRecipient { MobileNumber = "mobile-number-1" },
                        ],
                    },
                    new CorrespondenceNotificationRecipientWrapper()
                    {
                        RecipientToOverride = OrganisationOrPersonIdentifier.Create(
                            TestHelpers.GetOrganisationNumber(1)
                        ),
                        CorrespondenceNotificationRecipients =
                        [
                            new CorrespondenceNotificationRecipient
                            {
                                OrganizationNumber = TestHelpers.GetOrganisationNumber(1),
                            },
                            new CorrespondenceNotificationRecipient
                            {
                                NationalIdentityNumber = TestHelpers.GetNationalIdentityNumber(2),
                            },
                        ],
                    },
                ],
            },
            ExistingAttachments = [Guid.NewGuid(), Guid.NewGuid()],
        };

        // Act
        correspondence.Serialise(multipartContent);
        // csharpier-ignore

        // Assert
        var expectedSerialisation = new Dictionary<string, object?>
        {
            ["Recipients[0]"] = correspondence.Recipients[0].ToUrnFormattedString(),
            ["Recipients[1]"] = correspondence.Recipients[1].ToUrnFormattedString(),
            ["Correspondence.ResourceId"] = correspondence.ResourceId,
            ["Correspondence.Sender"] = correspondence.Sender.ToUrnFormattedString(),
            ["Correspondence.SendersReference"] = correspondence.SendersReference,
            ["Correspondence.RequestedPublishTime"] = correspondence.RequestedPublishTime,
            ["Correspondence.AllowSystemDeleteAfter"] = correspondence.AllowSystemDeleteAfter,
            ["Correspondence.DueDateTime"] = correspondence.DueDateTime,
            ["Correspondence.MessageSender"] = correspondence.MessageSender,
            ["Correspondence.IgnoreReservation"] = correspondence.IgnoreReservation,
            ["Correspondence.IsConfirmationNeeded"] = correspondence.IsConfirmationNeeded,
            ["Correspondence.Content.Language"] = correspondence.Content.Language,
            ["Correspondence.Content.MessageTitle"] = correspondence.Content.Title,
            ["Correspondence.Content.MessageSummary"] = correspondence.Content.Summary,
            ["Correspondence.Content.MessageBody"] = correspondence.Content.Body,
            ["Correspondence.Content.Attachments[0].Filename"] = correspondence.Content.Attachments[0].Filename,
            ["Correspondence.Content.Attachments[0].SendersReference"] = correspondence.Content.Attachments[0].SendersReference,
            ["Correspondence.Content.Attachments[1].Filename"] = correspondence.Content.Attachments[1].Filename,
            ["Correspondence.Content.Attachments[1].IsEncrypted"] = correspondence.Content.Attachments[1].IsEncrypted!,
            ["Correspondence.Content.Attachments[1].SendersReference"] = correspondence.Content.Attachments[1].SendersReference,
            ["Correspondence.ExternalReferences[0].ReferenceType"] = correspondence.ExternalReferences[0].ReferenceType,
            ["Correspondence.ExternalReferences[0].ReferenceValue"] = correspondence.ExternalReferences[0].ReferenceValue!,
            ["Correspondence.ExternalReferences[1].ReferenceType"] = correspondence.ExternalReferences[1].ReferenceType,
            ["Correspondence.ExternalReferences[1].ReferenceValue"] = correspondence.ExternalReferences[1].ReferenceValue!,
            ["Correspondence.ExternalReferences[2].ReferenceType"] = correspondence.ExternalReferences[2].ReferenceType,
            ["Correspondence.ExternalReferences[2].ReferenceValue"] = correspondence.ExternalReferences[2].ReferenceValue!,
            ["Correspondence.ExternalReferences[3].ReferenceType"] = correspondence.ExternalReferences[3].ReferenceType,
            ["Correspondence.ExternalReferences[3].ReferenceValue"] = correspondence.ExternalReferences[3].ReferenceValue!,
            ["Correspondence.ExternalReferences[4].ReferenceType"] = correspondence.ExternalReferences[4].ReferenceType,
            ["Correspondence.ExternalReferences[4].ReferenceValue"] = correspondence.ExternalReferences[4].ReferenceValue!,
            [$"Correspondence.PropertyList.{correspondence.PropertyList.Keys.First()}"] = correspondence.PropertyList.Values.First(),
            [$"Correspondence.PropertyList.{correspondence.PropertyList.Keys.Last()}"] = correspondence.PropertyList.Values.Last(),
            ["Correspondence.ReplyOptions[0].LinkUrl"] = correspondence.ReplyOptions[0].LinkUrl,
            ["Correspondence.ReplyOptions[0].LinkText"] = correspondence.ReplyOptions[0].LinkText!,
            ["Correspondence.ReplyOptions[1].LinkUrl"] = correspondence.ReplyOptions[1].LinkUrl,
            ["Correspondence.ReplyOptions[1].LinkText"] = correspondence.ReplyOptions[1].LinkText!,
            ["Correspondence.ExistingAttachments[0]"] = correspondence.ExistingAttachments[0],
            ["Correspondence.ExistingAttachments[1]"] = correspondence.ExistingAttachments[1],
            ["Correspondence.Notification.NotificationTemplate"] = correspondence.Notification.NotificationTemplate,
            ["Correspondence.Notification.EmailSubject"] = correspondence.Notification.EmailSubject,
            ["Correspondence.Notification.EmailBody"] = correspondence.Notification.EmailBody,
            ["Correspondence.Notification.SmsBody"] = correspondence.Notification.SmsBody,
            ["Correspondence.Notification.SendReminder"] = correspondence.Notification.SendReminder,
            ["Correspondence.Notification.ReminderEmailSubject"] = correspondence.Notification.ReminderEmailSubject,
            ["Correspondence.Notification.ReminderEmailBody"] = correspondence.Notification.ReminderEmailBody,
            ["Correspondence.Notification.ReminderSmsBody"] = correspondence.Notification.ReminderSmsBody,
            ["Correspondence.Notification.NotificationChannel"] = correspondence.Notification.NotificationChannel,
            ["Correspondence.Notification.ReminderNotificationChannel"] = correspondence.Notification.ReminderNotificationChannel,
            ["Correspondence.Notification.SendersReference"] = correspondence.Notification.SendersReference,
            ["Correspondence.Notification.RequestedSendTime"] = correspondence.Notification.RequestedSendTime,
            ["Correspondence.Notification.CustomRecipient.EmailAddress"] = correspondence.Notification.CustomNotificationRecipients[0].CorrespondenceNotificationRecipients[0].EmailAddress,
            ["Correspondence.Notification.CustomRecipient.OrganizationNumber"] = correspondence.Notification.CustomNotificationRecipients[0].CorrespondenceNotificationRecipients[0].OrganizationNumber,
        };

        foreach (var (key, value) in expectedSerialisation)
        {
            await AssertContent(multipartContent, key, value);
        }
    }

    private static async Task AssertContent(MultipartFormDataContent content, string dispositionName, object? value)
    {
        var item = content.GetItem(dispositionName);
        var stringValue = FormattedString(value);

        item.Should().NotBeNull($"FormDataContent with name `{dispositionName}` was not found");
        item!.Headers.ContentDisposition!.Name.Should().NotBeNull();
        dispositionName.Should().Be(item.Headers.ContentDisposition.Name!.Trim('\"'));
        stringValue.Should().Be(await item.ReadAsStringAsync(), $"`{dispositionName}`");
    }

    private static string FormattedString(object? value)
    {
        return value switch
        {
            OrganisationNumber org => org.ToUrnFormattedString(),
            NationalIdentityNumber person => person.ToUrnFormattedString(),
            OrganisationOrPersonIdentifier orgOrPerson => orgOrPerson.ToUrnFormattedString(),
            DateTime dateTime => MultipartCorrespondenceItem.NormaliseDateTime(dateTime).ToString("O"),
            DateTimeOffset dateTimeOffset => MultipartCorrespondenceItem
                .NormaliseDateTime(dateTimeOffset)
                .ToString("O"),
            _ => value?.ToString()
                ?? throw new NullReferenceException(
                    $"ToString method call for object `{nameof(value)} ({value?.GetType()})` returned null"
                ),
        };
    }
}
