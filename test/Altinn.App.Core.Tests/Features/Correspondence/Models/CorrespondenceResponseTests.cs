using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Correspondence.Models;

public class CorrespondenceResponseTests
{
    [Fact]
    public void Send_ValidResponse_DeserializesCorrectly()
    {
        // Arrange
        var encodedResponse = """
            {
               "correspondences": [
                  {
                     "correspondenceId": "d22d8dda-7b56-48c0-b287-5052aa255d5b",
                     "status": "Initialized",
                     "recipient": "0192:213872702",
                     "notifications": [
                        {
                           "orderId": "0ee29355-f2ca-4cd9-98e0-e97a4242d321",
                           "isReminder": false,
                           "status": "Success"
                        }
                     ]
                  },
                  {
                     "correspondenceId": "d22d8dda-7b56-48c0-b287-5052aa255d5b",
                     "status": "Published",
                     "recipient": "urn:altinn:organization:identifier-no:213872702",
                     "notifications": [
                        {
                           "orderId": "0ee29355-f2ca-4cd9-98e0-e97a4242d321",
                           "isReminder": true,
                           "status": "MissingContact"
                        }
                     ]
                  },
                  {
                     "correspondenceId": "d22d8dda-7b56-48c0-b287-5052aa255d5b",
                     "status": "Published",
                     "recipient": "13896396174",
                     "notifications": [
                        {
                           "orderId": "0ee29355-f2ca-4cd9-98e0-e97a4242d321",
                           "isReminder": true,
                           "status": "Success"
                        }
                     ]
                  },
                  {
                     "correspondenceId": "d22d8dda-7b56-48c0-b287-5052aa255d5b",
                     "status": "Published",
                     "recipient": "urn:altinn:person:identifier-no:13896396174",
                     "notifications": [
                        {
                           "orderId": "0ee29355-f2ca-4cd9-98e0-e97a4242d321",
                           "isReminder": true,
                           "status": "Success"
                        }
                     ]
                  }
               ],
               "attachmentIds": [
                  "cae24499-a5f9-425b-9c5b-4dac85fce891"
               ]
            }
            """;

        var testOrg = OrganisationOrPersonIdentifier.Create(OrganisationNumber.Parse("213872702"));
        var testPerson = OrganisationOrPersonIdentifier.Create(NationalIdentityNumber.Parse("13896396174"));

        // Act
        var parsedResponse = JsonSerializer.Deserialize<SendCorrespondenceResponse>(encodedResponse);

        // Assert
        Assert.NotNull(parsedResponse);
        Assert.NotNull(parsedResponse.Correspondences);
        Assert.NotNull(parsedResponse.AttachmentIds);

        parsedResponse.Correspondences.Should().HaveCount(4);
        parsedResponse
            .Correspondences[0]
            .CorrespondenceId.Should()
            .Be(Guid.Parse("d22d8dda-7b56-48c0-b287-5052aa255d5b"));
        parsedResponse.Correspondences[0].Status.Should().Be(CorrespondenceStatus.Initialized);
        parsedResponse.Correspondences[0].Recipient.Should().Be(testOrg);

        parsedResponse.Correspondences[0].Notifications.Should().HaveCount(1);
        parsedResponse
            .Correspondences[0]
            .Notifications![0]
            .OrderId.Should()
            .Be(Guid.Parse("0ee29355-f2ca-4cd9-98e0-e97a4242d321"));
        parsedResponse.Correspondences[0].Notifications![0].IsReminder.Should().BeFalse();
        parsedResponse
            .Correspondences[0]
            .Notifications![0]
            .Status.Should()
            .Be(CorrespondenceNotificationStatusResponse.Success);

        parsedResponse.Correspondences[1].Status.Should().Be(CorrespondenceStatus.Published);
        parsedResponse.Correspondences[1].Recipient.Should().Be(testOrg);
        parsedResponse.Correspondences[1].Notifications![0].IsReminder.Should().BeTrue();
        parsedResponse
            .Correspondences[1]
            .Notifications![0]
            .Status.Should()
            .Be(CorrespondenceNotificationStatusResponse.MissingContact);

        parsedResponse.Correspondences[2].Recipient.Should().Be(testPerson);
        parsedResponse.Correspondences[3].Recipient.Should().Be(testPerson);

        parsedResponse.AttachmentIds.Should().HaveCount(1);
        parsedResponse.AttachmentIds[0].Should().Be(Guid.Parse("cae24499-a5f9-425b-9c5b-4dac85fce891"));
    }

    [Fact]
    public void Status_ValidResponse_DeserializesCorrectly()
    {
        // Arrange
        var encodedResponse = """
            {
                "statusHistory": [
                    {
                        "status": "Initialized",
                        "statusText": "Initialized",
                        "statusChanged": "2024-11-14T11:05:56.843628+00:00"
                    },
                    {
                        "status": "ReadyForPublish",
                        "statusText": "ReadyForPublish",
                        "statusChanged": "2024-11-14T11:06:00.165998+00:00"
                    },
                    {
                        "status": "Published",
                        "statusText": "Published",
                        "statusChanged": "2024-11-14T11:06:56.208705+00:00"
                    }
                ],
                "notifications": [
                    {
                        "id": "598e8044-5ec4-43f9-8ce2-6a37c24cc7df",
                        "sendersReference": "1234",
                        "requestedSendTime": "2024-11-14T12:10:57.031351Z",
                        "creator": "digdir",
                        "created": "2024-11-14T11:05:57.237047Z",
                        "isReminder": true,
                        "notificationChannel": "EmailPreferred",
                        "ignoreReservation": true,
                        "resourceId": "test-resource-id",
                        "processingStatus": {
                            "status": "Registered",
                            "description": "Order has been registered and is awaiting requested send time before processing.",
                            "lastUpdate": "2024-11-14T11:05:57.237047Z"
                        },
                        "notificationStatusDetails": {
                            "email": null,
                            "sms": null
                        }
                    },
                    {
                        "id": "7ab0ff62-8c5d-4a2e-8ad2-7e7236e847a4",
                        "sendersReference": "1234",
                        "requestedSendTime": "2024-11-14T11:10:57.031351Z",
                        "creator": "digdir",
                        "created": "2024-11-14T11:05:57.054356Z",
                        "isReminder": false,
                        "notificationChannel": "EmailPreferred",
                        "ignoreReservation": true,
                        "resourceId": "test-resource-id",
                        "processingStatus": {
                            "status": "Completed",
                            "description": "Order processing is completed. All notifications have been generated.",
                            "lastUpdate": "2024-11-14T11:05:57.054356Z"
                        },
                        "notificationStatusDetails": {
                            "email": {
                                "id": "0dabcc5c-c3de-4636-922c-e7b351cdbbfa",
                                "succeeded": true,
                                "recipient": {
                                    "emailAddress": "someone@digdir.no",
                                    "mobileNumber": null,
                                    "organizationNumber": "213872702",
                                    "nationalIdentityNumber": null,
                                    "isReserved": null
                                },
                                "sendStatus": {
                                    "status": "Succeeded",
                                    "description": "The email has been accepted by the third party email service and will be sent shortly.",
                                    "lastUpdate": "2024-11-14T11:10:12.693438Z"
                                }
                            },
                            "sms": null
                        }
                    }
                ],
                "recipient": "urn:altinn:person:identifier-no:13896396174",
                "markedUnread": null,
                "correspondenceId": "94fa9dd9-734e-4712-9d49-4018aeb1a5dc",
                "content": {
                    "attachments": [
                        {
                            "created": "2024-11-14T11:05:56.843622+00:00",
                            "dataLocationType": "AltinnCorrespondenceAttachment",
                            "status": "Published",
                            "statusText": "Published",
                            "statusChanged": "2024-11-14T11:06:00.102333+00:00",
                            "expirationTime": "0001-01-01T00:00:00+00:00",
                            "id": "a40fad32-dad1-442d-b4e1-2564d4561c07",
                            "fileName": "hello-world-3-1.pDf",
                            "displayName": "This is the PDF filename 🍕",
                            "isEncrypted": false,
                            "checksum": "27bb85ec3681e3cd1ed44a079f5fc501",
                            "sendersReference": "1234",
                            "dataType": "application/pdf"
                        }
                    ],
                    "language": "en",
                    "messageTitle": "This is the title 👋🏻",
                    "messageSummary": "This is the summary ✌️",
                    "messageBody": "This is the message\n\nHere is a newline.\n\nHere are some emojis: 📎👴🏻👨🏼‍🍳🥰"
                },
                "created": "2024-11-14T11:05:56.575089+00:00",
                "status": "Published",
                "statusText": "Published",
                "statusChanged": "2024-11-14T11:06:56.208705+00:00",
                "resourceId": "test-resource-id",
                "sender": "urn:altinn:organization:identifier-no:991825827",
                "sendersReference": "1234",
                "messageSender": "Test Testesen",
                "requestedPublishTime": "2024-05-29T13:31:28.290518+00:00",
                "allowSystemDeleteAfter": "2025-05-29T13:31:28.290518+00:00",
                "dueDateTime": "2025-05-29T13:31:28.290518+00:00",
                "externalReferences": [
                    {
                        "referenceValue": "test",
                        "referenceType": "AltinnBrokerFileTransfer"
                    },
                    {
                        "referenceValue": "01932a59-edc3-7038-823e-cf46908cd83b",
                        "referenceType": "DialogportenDialogId"
                    }
                ],
                "propertyList": {
                    "anim5": "string",
                    "culpa_852": "string",
                    "deserunt_12": "string"
                },
                "replyOptions": [
                    {
                        "linkURL": "www.dgidir.no",
                        "linkText": "digdir"
                    }
                ],
                "notification": null,
                "ignoreReservation": true,
                "published": "2024-11-14T11:06:56.208705+00:00",
                "isConfirmationNeeded": false
            }
            """;

        // Act
        var parsedResponse = JsonSerializer.Deserialize<GetCorrespondenceStatusResponse>(encodedResponse);

        // Assert
        Assert.NotNull(parsedResponse);
        parsedResponse.StatusHistory.Should().HaveCount(3);
        parsedResponse
            .StatusHistory.Last()
            .Should()
            .Be(
                new CorrespondenceStatusEventResponse
                {
                    Status = CorrespondenceStatus.Published,
                    StatusText = "Published",
                    StatusChanged = DateTime.Parse("2024-11-14T11:06:56.208705+00:00"),
                }
            );
        parsedResponse.Notifications.Should().HaveCount(2);
        parsedResponse
            .Notifications!.Last()
            .Should()
            .BeEquivalentTo(
                new CorrespondenceNotificationOrderResponse
                {
                    Id = "7ab0ff62-8c5d-4a2e-8ad2-7e7236e847a4",
                    SendersReference = "1234",
                    RequestedSendTime = DateTimeOffset.Parse("2024-11-14T11:10:57.031351Z"),
                    Creator = "digdir",
                    Created = DateTimeOffset.Parse("2024-11-14T11:05:57.054356Z"),
                    NotificationChannel = CorrespondenceNotificationChannel.EmailPreferred,
                    IgnoreReservation = true,
                    ResourceId = "test-resource-id",
                    ProcessingStatus = new CorrespondenceNotificationStatusSummaryResponse
                    {
                        Status = "Completed",
                        Description = "Order processing is completed. All notifications have been generated.",
                        LastUpdate = DateTimeOffset.Parse("2024-11-14T11:05:57.054356Z"),
                    },
                    NotificationStatusDetails = new CorrespondenceNotificationSummaryResponse
                    {
                        Email = new CorrespondenceNotificationStatusDetailsResponse
                        {
                            Id = Guid.Parse("0dabcc5c-c3de-4636-922c-e7b351cdbbfa"),
                            Succeeded = true,
                            Recipient = new CorrespondenceNotificationRecipientResponse
                            {
                                EmailAddress = "someone@digdir.no",
                                OrganisationNumber = "213872702",
                            },
                            SendStatus = new CorrespondenceNotificationStatusSummaryResponse
                            {
                                Status = "Succeeded",
                                Description =
                                    "The email has been accepted by the third party email service and will be sent shortly.",
                                LastUpdate = DateTime.Parse("2024-11-14T11:10:12.693438Z").ToUniversalTime(),
                            },
                        },
                    },
                }
            );
        parsedResponse.Recipient.Should().Be("urn:altinn:person:identifier-no:13896396174");
        parsedResponse.CorrespondenceId.Should().Be(Guid.Parse("94fa9dd9-734e-4712-9d49-4018aeb1a5dc"));
        parsedResponse
            .Content.Should()
            .BeEquivalentTo(
                new CorrespondenceContentResponse
                {
                    Language = LanguageCode<Iso6391>.Parse("en"),
                    MessageTitle = "This is the title 👋🏻",
                    MessageSummary = "This is the summary ✌️",
                    MessageBody = "This is the message\n\nHere is a newline.\n\nHere are some emojis: 📎👴🏻👨🏼‍🍳🥰",
                    Attachments =
                    [
                        new CorrespondenceAttachmentResponse
                        {
                            Created = DateTimeOffset.Parse("2024-11-14T11:05:56.843622+00:00"),
                            DataLocationType = CorrespondenceDataLocationTypeResponse.AltinnCorrespondenceAttachment,
                            Status = CorrespondenceAttachmentStatusResponse.Published,
                            StatusText = "Published",
                            StatusChanged = DateTimeOffset.Parse("2024-11-14T11:06:00.102333+00:00"),
                            Id = Guid.Parse("a40fad32-dad1-442d-b4e1-2564d4561c07"),
                            FileName = "hello-world-3-1.pDf",
                            Checksum = "27bb85ec3681e3cd1ed44a079f5fc501",
                            SendersReference = "1234",
                            DataType = "application/pdf",
                        },
                    ],
                }
            );
        parsedResponse.Created.Should().Be(DateTimeOffset.Parse("2024-11-14T11:05:56.575089+00:00"));
        parsedResponse.Status.Should().Be(CorrespondenceStatus.Published);
        parsedResponse.StatusText.Should().Be("Published");
        parsedResponse.ResourceId.Should().Be("test-resource-id");
        parsedResponse.Sender.Should().Be(OrganisationNumber.Parse("991825827"));
        parsedResponse.SendersReference.Should().Be("1234");
        parsedResponse.MessageSender.Should().Be("Test Testesen");
        parsedResponse.RequestedPublishTime.Should().Be(DateTimeOffset.Parse("2024-05-29T13:31:28.290518+00:00"));
        parsedResponse.AllowSystemDeleteAfter.Should().Be(DateTimeOffset.Parse("2025-05-29T13:31:28.290518+00:00"));
        parsedResponse.DueDateTime.Should().Be(DateTimeOffset.Parse("2025-05-29T13:31:28.290518+00:00"));
        parsedResponse.ExternalReferences.Should().HaveCount(2);
        parsedResponse
            .ExternalReferences!.Last()
            .Should()
            .Be(
                new CorrespondenceExternalReference
                {
                    ReferenceType = CorrespondenceReferenceType.DialogportenDialogId,
                    ReferenceValue = "01932a59-edc3-7038-823e-cf46908cd83b",
                }
            );
        parsedResponse
            .PropertyList.Should()
            .BeEquivalentTo(
                new Dictionary<string, string>
                {
                    ["anim5"] = "string",
                    ["culpa_852"] = "string",
                    ["deserunt_12"] = "string",
                }
            );
        parsedResponse.ReplyOptions.Should().HaveCount(1);
        parsedResponse
            .ReplyOptions!.First()
            .Should()
            .Be(new CorrespondenceReplyOption { LinkUrl = "www.dgidir.no", LinkText = "digdir" });
        parsedResponse.IgnoreReservation.Should().BeTrue();
        parsedResponse.Published.Should().Be(DateTimeOffset.Parse("2024-11-14T11:06:56.208705+00:00"));
        parsedResponse.IsConfirmationNeeded.Should().BeFalse();
    }
}
