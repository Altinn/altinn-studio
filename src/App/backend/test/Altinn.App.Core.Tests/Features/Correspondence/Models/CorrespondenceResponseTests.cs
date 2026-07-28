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
                "isConfirmationNeeded": false,
                "isConfidential": false
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
        parsedResponse.IsConfidential.Should().BeFalse();
    }

    [Fact]
    public void Status_NotificationV2Response_DeserializesNullIdAndPluralRecipientLists()
    {
        // The Correspondence notification V2 integration may return a null notification "id" and exposes
        // the per-channel status as "emails"/"smses" lists (in addition to the legacy singular "email"/"sms").
        // See https://github.com/Altinn/altinn-studio/issues/17405.
        var encodedResponse = """
            {
                "statusHistory": [
                    {
                        "status": "Published",
                        "statusText": "Published",
                        "statusChanged": "2025-05-16T09:55:28.64087+00:00"
                    }
                ],
                "notifications": [
                    {
                        "id": "2d18f341-bb4a-457b-8b72-0ba2383494c7",
                        "sendersReference": "1234",
                        "creator": "TTD",
                        "created": "2025-05-16T09:55:29.55345Z",
                        "isReminder": false,
                        "notificationChannel": "EmailAndSms",
                        "ignoreReservation": true,
                        "resourceId": "dagl-correspondence",
                        "processingStatus": {
                            "status": "Order_Completed",
                            "description": null,
                            "lastUpdate": "2025-05-16T09:55:32.065336Z"
                        },
                        "notificationStatusDetails": {
                            "email": {
                                "id": null,
                                "succeeded": false,
                                "recipient": {
                                    "emailAddress": "tai.tien.huynh@digdir.no",
                                    "mobileNumber": null,
                                    "organizationNumber": null,
                                    "nationalIdentityNumber": null,
                                    "isReserved": null
                                },
                                "sendStatus": {
                                    "status": "Email_Delivered",
                                    "description": null,
                                    "lastUpdate": "2025-05-16T10:02:25.620188Z"
                                }
                            },
                            "sms": {
                                "id": "00000000-0000-0000-0000-000000000000",
                                "succeeded": false,
                                "recipient": {
                                    "emailAddress": null,
                                    "mobileNumber": "+4793477179",
                                    "organizationNumber": null,
                                    "nationalIdentityNumber": null,
                                    "isReserved": null
                                },
                                "sendStatus": {
                                    "status": "SMS_Accepted",
                                    "description": null,
                                    "lastUpdate": "2025-05-16T10:01:02.034718Z"
                                }
                            },
                            "emails": [
                                {
                                    "id": null,
                                    "succeeded": false,
                                    "recipient": {
                                        "emailAddress": "tai.tien.huynh@digdir.no"
                                    },
                                    "sendStatus": {
                                        "status": "Email_Delivered",
                                        "description": null,
                                        "lastUpdate": "2025-05-16T10:02:25.620188Z"
                                    }
                                }
                            ],
                            "smses": [
                                {
                                    "id": "00000000-0000-0000-0000-000000000000",
                                    "succeeded": false,
                                    "recipient": {
                                        "mobileNumber": "+4793477179"
                                    },
                                    "sendStatus": {
                                        "status": "SMS_Accepted",
                                        "description": null,
                                        "lastUpdate": "2025-05-16T10:01:02.034718Z"
                                    }
                                }
                            ]
                        }
                    }
                ],
                "recipient": "urn:altinn:organization:identifier-no:313756270",
                "correspondenceId": "0196d885-2d03-74cc-885d-13159c39b588",
                "created": "2025-05-16T09:55:28.641293+00:00",
                "status": "Published",
                "statusText": "Published",
                "statusChanged": "2025-05-16T09:55:28.64087+00:00",
                "resourceId": "dagl-correspondence",
                "sender": "urn:altinn:organization:identifier-no:310356875",
                "sendersReference": "1234",
                "ignoreReservation": true,
                "isConfirmationNeeded": true
            }
            """;

        // Act
        var parsedResponse = JsonSerializer.Deserialize<GetCorrespondenceStatusResponse>(encodedResponse);

        // Assert
        Assert.NotNull(parsedResponse);
        var statusDetails = parsedResponse.Notifications!.Single().NotificationStatusDetails;
        Assert.NotNull(statusDetails);

        // Singular "email" with a null id must parse (regression: was a non-nullable Guid).
        statusDetails.Email!.Id.Should().BeNull();
        statusDetails.Email.Recipient!.EmailAddress.Should().Be("tai.tien.huynh@digdir.no");
        statusDetails.Sms!.Id.Should().Be(Guid.Empty);
        statusDetails.Sms.Recipient!.MobileNumber.Should().Be("+4793477179");

        // Plural "emails"/"smses" lists are now exposed for multi-recipient notifications.
        statusDetails.Emails.Should().ContainSingle();
        statusDetails.Emails![0].Id.Should().BeNull();
        statusDetails.Emails[0].Recipient!.EmailAddress.Should().Be("tai.tien.huynh@digdir.no");
        statusDetails.Emails[0].SendStatus!.Status.Should().Be("Email_Delivered");

        statusDetails.Smses.Should().ContainSingle();
        statusDetails.Smses![0].Recipient!.MobileNumber.Should().Be("+4793477179");
        statusDetails.Smses[0].SendStatus!.Status.Should().Be("SMS_Accepted");
    }

    [Fact]
    public void Status_AttachmentsDownloadedStatus_DeserializesCorrectly()
    {
        // "AttachmentsDownloaded" is a valid CorrespondenceStatus returned by the API (e.g. once the
        // recipient downloads attachments). It appears both as the top-level status and in the history.
        // Regression: the value was missing from the enum, so JsonStringEnumConverter threw on it.
        var encodedResponse = """
            {
                "statusHistory": [
                    {
                        "status": "Published",
                        "statusText": "Published",
                        "statusChanged": "2025-05-16T09:55:28.64087+00:00"
                    },
                    {
                        "status": "AttachmentsDownloaded",
                        "statusText": "Attachment 0196d885-2b97-7e8d-b8fb-21bd0e64b39b has been downloaded",
                        "statusChanged": "2025-05-16T09:57:11.21523+00:00"
                    }
                ],
                "recipient": "urn:altinn:organization:identifier-no:313756270",
                "correspondenceId": "0196d885-2d03-74cc-885d-13159c39b588",
                "created": "2025-05-16T09:55:28.641293+00:00",
                "status": "AttachmentsDownloaded",
                "statusText": "Attachment 0196d885-2b97-7e8d-b8fb-21bd0e64b39b has been downloaded",
                "statusChanged": "2025-05-16T09:57:11.21523+00:00",
                "resourceId": "dagl-correspondence",
                "sender": "urn:altinn:organization:identifier-no:310356875",
                "sendersReference": "1234",
                "ignoreReservation": true,
                "isConfirmationNeeded": true
            }
            """;

        // Act
        var parsedResponse = JsonSerializer.Deserialize<GetCorrespondenceStatusResponse>(encodedResponse);

        // Assert
        Assert.NotNull(parsedResponse);
        parsedResponse.Status.Should().Be(CorrespondenceStatus.AttachmentsDownloaded);
        parsedResponse.StatusHistory.Last().Status.Should().Be(CorrespondenceStatus.AttachmentsDownloaded);
    }
}
