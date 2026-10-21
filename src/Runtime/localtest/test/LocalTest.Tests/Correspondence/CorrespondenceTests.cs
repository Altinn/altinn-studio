using System.Text.Json;
using Altinn.Correspondence.Controllers;
using Altinn.Notifications.Core.Integrations;
using Altinn.Notifications.Core.Models.ContactPoints;
using LocalTest.Configuration;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests.Correspondence;

public sealed class CorrespondenceTests : IDisposable
{
    private const string ResourceId = "ttd-signing-call-to-action";
    private const string OrganizationRecipient = "urn:altinn:organization:identifier-no:991825827";
    private const string PersonNumber = "01039012345";
    private const string PersonRecipient = "urn:altinn:person:identifier-no:" + PersonNumber;
    private const string OrganizationNumber = "991825827";

    private readonly string _storagePath = Path.Join(
        Path.GetTempPath(),
        $"localtest-correspondence-{Guid.NewGuid():N}"
    );
    private readonly LocalCorrespondenceRepository _repository;
    private readonly CorrespondenceController _controller;
    private readonly FakeContacts _contacts = new();

    public CorrespondenceTests()
    {
        _repository = new LocalCorrespondenceRepository(
            Options.Create(new LocalPlatformSettings { LocalTestingStorageBasePath = _storagePath }),
            NullLogger<LocalCorrespondenceRepository>.Instance
        );
        _controller = new CorrespondenceController(
            _repository,
            new CorrespondenceNotificationBuilder(_contacts, _contacts),
            _contacts
        );
    }

    [Fact]
    public async Task Initialize_MultipleRecipients_CreatesOneCorrespondencePerRecipientAndEchoesRecipient()
    {
        var response = await Initialize(Request(OrganizationRecipient, PersonRecipient));

        Assert.Equal(
            new[] { OrganizationRecipient, PersonRecipient },
            response.Correspondences.Select(correspondence => correspondence.Recipient)
        );
        Assert.Empty(response.AttachmentIds);
        Assert.All(
            response.Correspondences,
            correspondence =>
            {
                Assert.NotEqual(Guid.Empty, correspondence.CorrespondenceId);
                Assert.Equal(CorrespondenceStatus.Published, correspondence.Status);
            }
        );
        Assert.Equal(
            response
                .Correspondences.Select(correspondence => correspondence.CorrespondenceId)
                .Order(),
            response
                .Correspondences.Select(correspondence => correspondence.CorrespondenceId)
                .Distinct()
                .Order()
        );
        Assert.Equal(2, Directory.GetFiles(Path.Join(_storagePath, "correspondence")).Length);
    }

    [Fact]
    public async Task Initialize_StoresIdempotentKeyAndTheRequestTheAppSent()
    {
        var idempotentKey = Guid.NewGuid();

        var response = await Initialize(
            Request(OrganizationRecipient, idempotentKey: idempotentKey)
        );

        var correspondenceId = Assert.Single(response.Correspondences).CorrespondenceId;
        var stored = await _repository.Find(correspondenceId);
        Assert.NotNull(stored);
        Assert.Equal(idempotentKey, stored.IdempotentKey);
        Assert.Equal(OrganizationRecipient, stored.Recipient);
        Assert.Equal(ResourceId, stored.ResourceId);
        Assert.Equal("senders-reference", stored.SendersReference);
        Assert.Equal(CorrespondenceStatus.Published, stored.Status);
        Assert.Equal(
            "Task_1 is ready for signing",
            stored
                .Request.GetProperty("correspondence")
                .GetProperty("content")
                .GetProperty("messageTitle")
                .GetString()
        );
    }

    [Fact]
    public async Task Initialize_RepeatedIdempotentKey_ReturnsConflict()
    {
        var idempotentKey = Guid.NewGuid();
        await Initialize(Request(OrganizationRecipient, idempotentKey: idempotentKey));

        var problem = await InitializeProblem(
            Request(PersonRecipient, idempotentKey: idempotentKey)
        );

        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal("Conflict", problem.Title);
        Assert.Equal("A correspondence with the same idempotent key already exists", problem.Detail);
        Assert.Equal(1034, problem.Extensions["errorCode"]);
        Assert.Single(await _repository.Read());
    }

    [Fact]
    public async Task Initialize_ConcurrentRequestsWithSameIdempotentKey_CreatesExactlyOne()
    {
        var idempotentKey = Guid.NewGuid();

        var results = await Task.WhenAll(
            Enumerable
                .Range(0, 4)
                .Select(_ =>
                    _controller.InitializeCorrespondences(
                        Request(OrganizationRecipient, idempotentKey: idempotentKey)
                    )
                )
        );

        Assert.Single(results.OfType<OkObjectResult>());
        Assert.Single(await _repository.Read());
    }

    [Fact]
    public async Task Initialize_RetryThatHasSinceBecomeInvalid_ReturnsConflict()
    {
        var idempotentKey = Guid.NewGuid();
        await Initialize(Request(OrganizationRecipient, idempotentKey: idempotentKey));

        // The real API looks the key up before it checks the due date, so the retry is still "already sent"
        var problem = await InitializeProblem(
            Request(
                [OrganizationRecipient],
                idempotentKey,
                configure: c => c["dueDateTime"] = DateTimeOffset.UtcNow.AddDays(-1)
            )
        );

        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal(1034, problem.Extensions["errorCode"]);
    }

    [Fact]
    public async Task Initialize_MalformedRequestWithUsedIdempotentKey_ReturnsBadRequest()
    {
        var idempotentKey = Guid.NewGuid();
        await Initialize(Request(OrganizationRecipient, idempotentKey: idempotentKey));

        // Model validation runs before the real API looks the key up
        var problem = await InitializeProblem(
            Request([OrganizationRecipient], idempotentKey, resourceId: null)
        );

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
    }

    [Fact]
    public async Task Initialize_RecordFromAnOlderLocaltestInStorage_StillHonorsItsIdempotentKey()
    {
        var oldCorrespondenceId = Guid.NewGuid();
        var oldIdempotentKey = Guid.NewGuid();
        Directory.CreateDirectory(Path.Join(_storagePath, "correspondence"));
        await File.WriteAllTextAsync(
            Path.Join(_storagePath, "correspondence", $"{oldCorrespondenceId}.json"),
            $$"""
            {
              "correspondenceId": "{{oldCorrespondenceId}}",
              "idempotentKey": "{{oldIdempotentKey}}",
              "recipient": "{{PersonRecipient}}",
              "resourceId": "{{ResourceId}}",
              "sendersReference": "501337/old",
              "messageSender": null,
              "status": "Initialized",
              "created": "2026-09-11T08:11:15.5997297+00:00",
              "request": { "correspondence": { "content": { "messageTitle": "Old" } } }
            }
            """
        );

        var conflict = await InitializeProblem(
            Request(PersonRecipient, idempotentKey: oldIdempotentKey)
        );
        await Initialize(Request(PersonRecipient, idempotentKey: Guid.NewGuid()));

        Assert.Equal(StatusCodes.Status409Conflict, conflict.Status);
        Assert.Equal(2, (await _repository.Read()).Count);
        var details = Assert.IsType<CorrespondenceDetailsResponseDto>(
            Assert.IsType<OkObjectResult>(
                await _controller.GetCorrespondenceDetails(oldCorrespondenceId)
            ).Value
        );
        Assert.Equal("Old", details.Content?.MessageTitle);
        Assert.Equal(
            [CorrespondenceStatus.Initialized],
            details.StatusHistory.Select(status => status.Status)
        );
    }

    [Fact]
    public async Task GetDetails_StoredRequestInAnUnknownShape_ReturnsTheRecordWithoutItsContent()
    {
        var correspondenceId = Guid.NewGuid();
        Directory.CreateDirectory(Path.Join(_storagePath, "correspondence"));
        await File.WriteAllTextAsync(
            Path.Join(_storagePath, "correspondence", $"{correspondenceId}.json"),
            $$"""
            {
              "correspondenceId": "{{correspondenceId}}",
              "recipient": "{{PersonRecipient}}",
              "resourceId": "{{ResourceId}}",
              "sendersReference": "501337/old",
              "status": "Published",
              "created": "2026-09-11T08:11:15.5997297+00:00",
              "request": { "correspondence": { "content": "not an object" } }
            }
            """
        );

        var details = Assert.IsType<CorrespondenceDetailsResponseDto>(
            Assert.IsType<OkObjectResult>(
                await _controller.GetCorrespondenceDetails(correspondenceId)
            ).Value
        );

        Assert.Equal(PersonRecipient, details.Recipient);
        Assert.Equal(string.Empty, details.Content?.MessageTitle);
    }

    [Fact]
    public async Task Initialize_UnreadableFileInStorage_IsSkipped()
    {
        Directory.CreateDirectory(Path.Join(_storagePath, "correspondence"));
        await File.WriteAllTextAsync(
            Path.Join(_storagePath, "correspondence", $"{Guid.NewGuid()}.json"),
            "not json"
        );

        var response = await Initialize(Request(PersonRecipient, idempotentKey: Guid.NewGuid()));

        var stored = Assert.Single(await _repository.Read());
        Assert.Equal(Assert.Single(response.Correspondences).CorrespondenceId, stored.CorrespondenceId);
    }

    [Fact]
    public async Task Initialize_IdempotentKeyWithMultipleRecipients_ReturnsBadRequest()
    {
        var problem = await InitializeProblem(
            Request(OrganizationRecipient, PersonRecipient, idempotentKey: Guid.NewGuid())
        );

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Equal(1047, problem.Extensions["errorCode"]);
        Assert.Empty(await _repository.Read());
    }

    [Fact]
    public async Task Initialize_NoRecipients_ReturnsBadRequest()
    {
        var problem = await InitializeProblem(Request());

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Empty(await _repository.Read());
    }

    [Fact]
    public async Task Initialize_EmptyRecipient_ReturnsBadRequest()
    {
        var request = JsonDocument
            .Parse("""{"recipients": ["urn:altinn:organization:identifier-no:991825827", null, " "]}""")
            .RootElement;

        var problem = await InitializeProblem(request);

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Empty(await _repository.Read());
    }

    [Fact]
    public async Task Details_ReturnsTheStoredCorrespondence()
    {
        var response = await Initialize(
            Request(OrganizationRecipient, idempotentKey: Guid.NewGuid())
        );
        var created = Assert.Single(response.Correspondences);

        var result = await _controller.GetCorrespondenceDetails(created.CorrespondenceId);
        var details = Assert.IsType<CorrespondenceDetailsResponseDto>(
            Assert.IsType<OkObjectResult>(result).Value
        );

        Assert.Equal(created.CorrespondenceId, details.CorrespondenceId);
        Assert.Equal(OrganizationRecipient, details.Recipient);
        Assert.Equal(ResourceId, details.ResourceId);
        Assert.Equal("senders-reference", details.SendersReference);
        Assert.Equal(CorrespondenceStatus.Published, details.Status);
        Assert.Equal(
            [CorrespondenceStatus.Initialized, CorrespondenceStatus.ReadyForPublish, CorrespondenceStatus.Published],
            details.StatusHistory.Select(statusEvent => statusEvent.Status)
        );
        Assert.Equal("0192:991825827", details.Sender);
        Assert.Equal("Task_1 is ready for signing", details.Content?.MessageTitle);
        Assert.Equal("You have a document to sign", details.Content?.MessageSummary);
        Assert.Equal("nb", details.Content?.Language);
        Assert.NotNull(details.Published);
        Assert.Empty(details.Notifications);
    }

    [Fact]
    public async Task Details_RequestWithoutLanguage_IsInBokmal()
    {
        var response = await Initialize(
            Request([OrganizationRecipient], null, configure: c => Content(c).Remove("language"))
        );

        var created = Assert.Single(response.Correspondences);

        var result = await _controller.GetCorrespondenceDetails(created.CorrespondenceId);
        var details = Assert.IsType<CorrespondenceDetailsResponseDto>(Assert.IsType<OkObjectResult>(result).Value);

        Assert.Equal("nb", details.Content?.Language);
    }

    [Fact]
    public async Task Details_UnknownCorrespondence_ReturnsNotFound()
    {
        var result = await _controller.GetCorrespondenceDetails(Guid.NewGuid());

        var problem = Assert.IsType<ProblemDetails>(Assert.IsType<ObjectResult>(result).Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Attachment_InitializeUploadAndRead_IsPublishedWithTheUploadedData()
    {
        byte[] data = "%PDF-1.7 signed document"u8.ToArray();

        Guid attachmentId = await InitializeAttachment();
        var uploaded = await UploadAttachment(attachmentId, data);
        var read = Assert.IsType<AttachmentOverviewDto>(
            Assert.IsType<OkObjectResult>(await _controller.GetAttachmentOverview(attachmentId)).Value
        );

        Assert.Equal(AttachmentStatus.Published, uploaded.Status);
        Assert.Equal(AttachmentStatus.Published, read.Status);
        Assert.Equal("application/pdf", read.DataType);
        Assert.Equal("signed.pdf", read.FileName);
        Assert.Equal(
            data,
            await File.ReadAllBytesAsync(
                Path.Join(_storagePath, "correspondence", "attachments", $"{attachmentId}.bin")
            )
        );
    }

    [Fact]
    public async Task Attachment_UploadedTwice_ReturnsBadRequest()
    {
        Guid attachmentId = await InitializeAttachment();
        await UploadAttachment(attachmentId, [1]);

        var result = await Upload(attachmentId, [2]);

        Assert.Equal(StatusCodes.Status400BadRequest, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task Attachment_Unknown_ReturnsNotFound()
    {
        var upload = await Upload(Guid.NewGuid(), [1]);
        var read = await _controller.GetAttachmentOverview(Guid.NewGuid());

        Assert.Equal(StatusCodes.Status404NotFound, Assert.IsType<ObjectResult>(upload).StatusCode);
        Assert.Equal(StatusCodes.Status404NotFound, Assert.IsType<ObjectResult>(read).StatusCode);
    }

    [Fact]
    public async Task Initialize_WithUploadedAttachment_LinksIt()
    {
        Guid attachmentId = await InitializeAttachment();
        await UploadAttachment(attachmentId, [1]);

        var response = await Initialize(Request([OrganizationRecipient], null, [attachmentId]));

        Assert.Equal([attachmentId], response.AttachmentIds);
    }

    [Fact]
    public async Task Initialize_WithAttachmentNotUploaded_ReturnsBadRequest()
    {
        Guid attachmentId = await InitializeAttachment();

        var problem = await InitializeProblem(Request([OrganizationRecipient], null, [attachmentId]));

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Empty(await _repository.Read());
    }

    [Fact]
    public async Task Notification_CustomMessage_EmailsThePersonsRegisteredAddress()
    {
        _contacts.Users[PersonNumber] = new UserContactPoints
        {
            NationalIdentityNumber = PersonNumber,
            Email = "signee@example.com",
            MobileNumber = "+4799999999",
        };

        var response = await Initialize(
            Request([PersonRecipient], null, notification: Notification("Email"))
        );

        var initialized = Assert.Single(Assert.Single(response.Correspondences).Notifications);
        Assert.Equal(NotificationStatus.Success, initialized.Status);
        Assert.False(initialized.IsReminder);
        var stored = Assert.Single(await _repository.Read());
        var email = Assert.Single(Assert.Single(stored.Notifications).Emails);
        Assert.Equal("signee@example.com", email.Recipient.EmailAddress);
        Assert.Equal(PersonNumber, email.Recipient.NationalIdentityNumber);
        Assert.Equal("Sign the document", email.Subject);
        Assert.Equal("You have a document to sign in Altinn.", email.Body);
        Assert.Empty(stored.Notifications[0].Smses);
    }

    [Theory]
    [InlineData("EmailPreferred", "", "+4799999999", 0, 1)]
    [InlineData("SmsPreferred", "signee@example.com", "", 1, 0)]
    [InlineData("EmailAndSms", "signee@example.com", "+4799999999", 1, 1)]
    [InlineData("Sms", "signee@example.com", "", 0, 0)]
    public async Task Notification_Channel_PicksTheAddressesItCan(
        string channel,
        string email,
        string mobile,
        int expectedEmails,
        int expectedSms
    )
    {
        _contacts.Users[PersonNumber] = new UserContactPoints
        {
            NationalIdentityNumber = PersonNumber,
            Email = email,
            MobileNumber = mobile,
        };

        var response = await Initialize(Request([PersonRecipient], null, notification: Notification(channel)));

        var notification = Assert.Single((await _repository.Read())[0].Notifications);
        Assert.Equal(expectedEmails, notification.Emails.Count);
        Assert.Equal(expectedSms, notification.Smses.Count);
        Assert.Equal(
            expectedEmails + expectedSms > 0 ? NotificationStatus.Success : NotificationStatus.MissingContact,
            Assert.Single(response.Correspondences[0].Notifications).Status
        );
    }

    [Fact]
    public async Task Notification_WithReminder_OrdersTheReminderAWeekLater()
    {
        _contacts.Organizations[OrganizationNumber] = new OrganizationContactPoints
        {
            OrganizationNumber = OrganizationNumber,
            EmailList = ["post@org.example", "boss@org.example"],
        };
        var notification = Notification("Email");
        notification["sendReminder"] = true;
        notification["reminderEmailSubject"] = "Reminder: sign the document";
        notification["reminderEmailBody"] = "You still have a document to sign in Altinn.";

        await Initialize(Request([OrganizationRecipient], null, notification: notification));

        var stored = Assert.Single(await _repository.Read());
        Assert.Equal(2, stored.Notifications.Count);
        var reminder = Assert.Single(stored.Notifications, order => order.IsReminder);
        Assert.Equal(CorrespondenceNotificationBuilder.ReminderDelay, reminder.RequestedSendTime - reminder.Created);
        Assert.All(reminder.Emails, email => Assert.Equal("Reminder: sign the document", email.Subject));
        Assert.Equal(
            ["boss@org.example", "post@org.example"],
            reminder.Emails.Select(email => email.Recipient.EmailAddress).Order()
        );
    }

    [Fact]
    public async Task Notification_GenericTemplate_UsesAltinnsText()
    {
        _contacts.Users[PersonNumber] = new UserContactPoints
        {
            NationalIdentityNumber = PersonNumber,
            Email = "signee@example.com",
        };
        var notification = Notification("Email");
        notification["notificationTemplate"] = "GenericAltinnMessage";

        await Initialize(Request([PersonRecipient], null, notification: notification));

        var email = Assert.Single(Assert.Single((await _repository.Read())[0].Notifications).Emails);
        Assert.Equal(CorrespondenceNotificationBuilder.GenericEmailSubject, email.Subject);
    }

    [Fact]
    public async Task Notification_CustomRecipients_ReplaceTheRegisteredAddresses()
    {
        _contacts.Users[PersonNumber] = new UserContactPoints
        {
            NationalIdentityNumber = PersonNumber,
            Email = "registered@example.com",
        };
        var notification = Notification("Email");
        notification["customRecipients"] = new[] { new Dictionary<string, object?> { ["emailAddress"] = "custom@example.com" } };
        notification["overrideRegisteredContactInformation"] = true;

        await Initialize(Request([PersonRecipient], null, notification: notification));

        var email = Assert.Single(Assert.Single((await _repository.Read())[0].Notifications).Emails);
        Assert.Equal("custom@example.com", email.Recipient.EmailAddress);
    }

    [Fact]
    public async Task Details_ListAttachmentsAndNotifications()
    {
        _contacts.Users[PersonNumber] = new UserContactPoints
        {
            NationalIdentityNumber = PersonNumber,
            Email = "signee@example.com",
        };
        Guid attachmentId = await InitializeAttachment();
        await UploadAttachment(attachmentId, [1, 2, 3]);
        var response = await Initialize(
            Request([PersonRecipient], null, [attachmentId], notification: Notification("Email"))
        );

        var details = Assert.IsType<CorrespondenceDetailsResponseDto>(
            Assert.IsType<OkObjectResult>(
                await _controller.GetCorrespondenceDetails(response.Correspondences[0].CorrespondenceId)
            ).Value
        );

        var attachment = Assert.Single(details.Content!.Attachments);
        Assert.Equal(attachmentId, attachment.Id);
        Assert.Equal("signed.pdf", attachment.FileName);
        Assert.Equal(AttachmentStatus.Published, attachment.Status);
        var order = Assert.Single(details.Notifications);
        Assert.Equal(NotificationChannel.Email, order.NotificationChannel);
        Assert.Equal("signee@example.com", order.NotificationStatusDetails?.Email?.Recipient?.EmailAddress);
        Assert.True(order.NotificationStatusDetails?.Email?.Succeeded);
    }

    [Theory]
    [InlineData(null, "Title")]
    [InlineData(ResourceId, null)]
    public async Task Initialize_WithoutResourceOrTitle_ReturnsBadRequest(string? resourceId, string? title)
    {
        var problem = await InitializeProblem(
            Request([OrganizationRecipient], null, resourceId: resourceId, messageTitle: title)
        );

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Empty(await _repository.Read());
    }

    /// <summary>Requests the real Correspondence API refuses, by case, with the error code it answers.</summary>
    private static readonly Dictionary<string, (Action<Dictionary<string, object?>> Configure, int ErrorCode)> _refused =
        new()
        {
            ["title with HTML"] = (c => Content(c)["messageTitle"] = "<b>Sign</b> the document", 1002),
            ["title with a link"] = (c => Content(c)["messageTitle"] = "[Sign](https://example.com)", 1002),
            ["title with emphasis"] = (c => Content(c)["messageTitle"] = "Sign **now**", 1002),
            ["title too long"] = (c => Content(c)["messageTitle"] = new string('a', 256), 1037),
            ["summary too long"] = (c => Content(c)["messageSummary"] = new string('a', 256), 1042),
            ["empty body"] = (c => Content(c)["messageBody"] = "", 1021),
            ["body too long"] = (c => Content(c)["messageBody"] = new string('a', 30001), 1022),
            ["unsupported language"] = (c => Content(c)["language"] = "sv", 1023),
            ["sender with HTML"] = (c => c["messageSender"] = "<i>Testdepartementet</i>", 1039),
            ["due date passed"] = (c => c["dueDateTime"] = DateTimeOffset.UtcNow.AddDays(-1), 1008),
            ["due date before publishing"] = (
                c =>
                {
                    c["requestedPublishTime"] = DateTimeOffset.UtcNow.AddDays(10);
                    c["dueDateTime"] = DateTimeOffset.UtcNow.AddDays(5);
                },
                1009
            ),
            ["confirmation without due date"] = (c => c["isConfirmationNeeded"] = true, 1016),
            ["custom email without body"] = (
                c => c["notification"] = CustomNotification("Email", ("emailSubject", "Sign")),
                3002
            ),
            ["custom SMS reminder without text"] = (
                c =>
                {
                    var notification = CustomNotification("Sms", ("smsBody", "Sign"));
                    notification["sendReminder"] = true;
                    c["notification"] = notification;
                },
                3005
            ),
            ["preferred channel without SMS text"] = (
                c => c["notification"] = CustomNotification("EmailPreferred", ("emailSubject", "Sign"), ("emailBody", "Sign")),
                3006
            ),
            ["override without custom recipients"] = (
                c =>
                {
                    var notification = Notification("Email");
                    notification["overrideRegisteredContactInformation"] = true;
                    c["notification"] = notification;
                },
                3022
            ),
            ["custom recipient with two identifiers"] = (
                c => c["notification"] = WithCustomRecipient(new() { ["emailAddress"] = "a@example.com", ["mobileNumber"] = "+4799999999" }),
                3018
            ),
            ["custom recipient without identifier"] = (c => c["notification"] = WithCustomRecipient(new()), 3019),
            ["custom recipient with invalid email"] = (
                c => c["notification"] = WithCustomRecipient(new() { ["emailAddress"] = "not-an-email" }),
                3011
            ),
            ["custom recipient with invalid mobile number"] = (
                c => c["notification"] = WithCustomRecipient(new() { ["mobileNumber"] = "call me" }),
                3012
            ),
            ["custom recipient with mobile number without country code"] = (
                c => c["notification"] = WithCustomRecipient(new() { ["mobileNumber"] = "87654321" }),
                3012
            ),
            ["custom recipient with mobile number libphonenumber cannot parse"] = (
                c => c["notification"] = WithCustomRecipient(new() { ["mobileNumber"] = "+" }),
                3012
            ),
            ["recipient name with custom email"] = (
                c =>
                {
                    var notification = WithCustomRecipient(new() { ["emailAddress"] = "a@example.com" });
                    notification["emailBody"] = "Hello $recipientName$";
                    c["notification"] = notification;
                },
                3015
            ),
        };

    public static TheoryData<string> RefusedRequests => [.. _refused.Keys];

    [Theory]
    [MemberData(nameof(RefusedRequests))]
    public async Task Initialize_RequestTheRealApiRefuses_AnswersItsError(string refused)
    {
        var (configure, errorCode) = _refused[refused];

        var problem = await InitializeProblem(Request([PersonRecipient], null, configure: configure));

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Equal("Bad Request", problem.Title);
        Assert.Equal(errorCode, problem.Extensions["errorCode"]);
        Assert.Empty(await _repository.Read());
    }

    /// <summary>
    /// Requests the real Correspondence API accepts, by case. Localtest must not be stricter than a deployed
    /// environment.
    /// </summary>
    private static readonly Dictionary<string, Action<Dictionary<string, object?>>> _accepted = new()
    {
        ["title with plain punctuation"] = c => Content(c)["messageTitle"] = "Oppgave - signer 2 * 3 dokumenter (file_name_v2)",
        ["body with an HTML line break"] = c =>
            Content(c)["messageBody"] = "The signed documents are attached. <br /><br />Contact us with any questions.",
        ["summary with markdown"] = c => Content(c)["messageSummary"] = "Sign **now**",
        ["upper case language"] = c => Content(c)["language"] = "NB",
        ["generic template without texts"] = c =>
            c["notification"] = new Dictionary<string, object?>
            {
                ["notificationTemplate"] = "GenericAltinnMessage",
                ["notificationChannel"] = "EmailPreferred",
                ["sendReminder"] = true,
            },
        ["due date after publishing"] = c =>
        {
            c["isConfirmationNeeded"] = true;
            c["dueDateTime"] = DateTimeOffset.UtcNow.AddDays(14);
        },
        ["custom recipients overriding the registered ones"] = c =>
            c["notification"] = WithCustomRecipient(new() { ["mobileNumber"] = "+4799999999" }),
        ["custom recipient with mobile number with punctuation"] = c =>
            c["notification"] = WithCustomRecipient(new() { ["mobileNumber"] = "+47 999-99-999" }),
        ["custom recipient with mobile number with 00 country code"] = c =>
            c["notification"] = WithCustomRecipient(new() { ["mobileNumber"] = "004799999999" }),
        ["no language"] = c => Content(c).Remove("language"),
    };

    public static TheoryData<string> AcceptedRequests => [.. _accepted.Keys];

    [Theory]
    [MemberData(nameof(AcceptedRequests))]
    public async Task Initialize_RequestTheRealApiAccepts_CreatesIt(string accepted)
    {
        var response = await Initialize(Request([PersonRecipient], null, configure: _accepted[accepted]));

        Assert.Single(response.Correspondences);
    }

    [Fact]
    public async Task Initialize_CustomRecipientWithMultipleRecipients_ReturnsBadRequest()
    {
        var problem = await InitializeProblem(
            Request(
                [OrganizationRecipient, PersonRecipient],
                null,
                configure: c => c["notification"] = WithCustomRecipient(new() { ["emailAddress"] = "a@example.com" })
            )
        );

        Assert.Equal(3017, problem.Extensions["errorCode"]);
    }

    [Fact]
    public async Task Initialize_RecipientTheRegisterDoesNotKnow_ReturnsLookupFailure()
    {
        _contacts.UnknownParties.Add(PersonNumber);

        var problem = await InitializeProblem(Request([OrganizationRecipient, PersonRecipient], null));

        Assert.Equal(1029, problem.Extensions["errorCode"]);
        Assert.Equal($"Could not find partyId for the following recipients: {PersonNumber}", problem.Detail);
        Assert.Empty(await _repository.Read());
    }

    [Theory]
    [InlineData("991825827")]
    [InlineData("urn:altinn:organization:identifier-no:99182582")]
    [InlineData("urn:altinn:person:identifier-no:0103901234")]
    [InlineData("someone@example.com")]
    public async Task Initialize_RecipientInAnUnknownFormat_ReturnsBadRequest(string recipient)
    {
        var problem = await InitializeProblem(Request([recipient], null));

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.StartsWith("Recipient should be an organization number", problem.Detail);
    }

    [Theory]
    [InlineData("0192:991825827")]
    [InlineData("01039012345")]
    [InlineData("urn:altinn:person:idporten-email:someone@example.com")]
    [InlineData("urn:altinn:person:legacy-selfidentified:someone")]
    public async Task Initialize_RecipientInAnotherAcceptedFormat_CreatesIt(string recipient)
    {
        var response = await Initialize(Request([recipient], null));

        Assert.Equal(recipient, Assert.Single(response.Correspondences).Recipient);
    }

    [Fact]
    public async Task Initialize_UnknownOrTooManyExistingAttachments_ReturnsBadRequest()
    {
        var unknown = await InitializeProblem(Request([PersonRecipient], null, [Guid.NewGuid()]));
        var tooMany = await InitializeProblem(
            Request([PersonRecipient], null, [.. Enumerable.Range(0, 101).Select(_ => Guid.NewGuid())])
        );

        Assert.Equal(1007, unknown.Extensions["errorCode"]);
        Assert.Equal(1038, tooMany.Extensions["errorCode"]);
    }

    [Theory]
    [InlineData(null, 2010)]
    [InlineData("program.exe", 2013)]
    [InlineData("signed:document.pdf", 2012)]
    [InlineData("CON.pdf", 2021)]
    public async Task InitializeAttachment_FileNameTheRealApiRefuses_AnswersItsError(string? fileName, int errorCode)
    {
        var result = await _controller.InitializeAttachment(
            new InitializeAttachmentRequestDto
            {
                ResourceId = ResourceId,
                FileName = fileName,
                SendersReference = "senders-reference",
            }
        );

        var problem = Assert.IsType<ProblemDetails>(Assert.IsType<ObjectResult>(result).Value);
        Assert.Equal(errorCode, problem.Extensions["errorCode"]);
    }

    [Fact]
    public async Task Notification_CustomRecipientWithoutOverride_IsNotifiedAlongsideTheRegisteredAddress()
    {
        _contacts.Users[PersonNumber] = new UserContactPoints
        {
            NationalIdentityNumber = PersonNumber,
            Email = "registered@example.com",
        };
        var notification = WithCustomRecipient(new() { ["emailAddress"] = "custom@example.com" });
        notification["overrideRegisteredContactInformation"] = false;

        await Initialize(Request([PersonRecipient], null, notification: notification));

        var emails = Assert.Single((await _repository.Read())[0].Notifications).Emails;
        Assert.Equal(
            ["custom@example.com", "registered@example.com"],
            emails.Select(email => email.Recipient.EmailAddress).Order()
        );
    }

    [Fact]
    public async Task Notification_CustomRecipientByUrn_UsesTheirRegisteredAddress()
    {
        _contacts.Users[PersonNumber] = new UserContactPoints
        {
            NationalIdentityNumber = PersonNumber,
            Email = "signee@example.com",
        };
        var notification = WithCustomRecipient(new() { ["nationalIdentityNumber"] = PersonRecipient });

        await Initialize(Request([OrganizationRecipient], null, notification: notification));

        var email = Assert.Single(Assert.Single((await _repository.Read())[0].Notifications).Emails);
        Assert.Equal("signee@example.com", email.Recipient.EmailAddress);
    }

    private static Dictionary<string, object?> Content(Dictionary<string, object?> correspondence) =>
        (Dictionary<string, object?>)correspondence["content"]!;

    private static Dictionary<string, object?> CustomNotification(string channel, params (string Key, string Value)[] texts)
    {
        var notification = new Dictionary<string, object?>
        {
            ["notificationTemplate"] = "CustomMessage",
            ["notificationChannel"] = channel,
        };
        foreach (var (key, value) in texts)
        {
            notification[key] = value;
        }
        return notification;
    }

    private static Dictionary<string, object?> WithCustomRecipient(Dictionary<string, object?> customRecipient)
    {
        var notification = Notification("EmailAndSms");
        notification["customRecipients"] = new[] { customRecipient };
        notification["overrideRegisteredContactInformation"] = true;
        return notification;
    }

    private static Dictionary<string, object?> Notification(string channel) =>
        new()
        {
            ["notificationTemplate"] = "CustomMessage",
            ["emailSubject"] = "Sign the document",
            ["emailBody"] = "You have a document to sign in Altinn.",
            ["smsBody"] = "You have a document to sign in Altinn.",
            ["notificationChannel"] = channel,
        };

    private sealed class FakeContacts : IProfileClient, IRegisterClient, ICorrespondenceRecipientRegister
    {
        public Dictionary<string, UserContactPoints> Users { get; } = [];
        public Dictionary<string, OrganizationContactPoints> Organizations { get; } = [];

        /// <summary>Numbers the register does not know. Every other party exists.</summary>
        public HashSet<string> UnknownParties { get; } = [];

        public Task<bool> Exists(CorrespondenceRecipient recipient) =>
            Task.FromResult(!UnknownParties.Contains(recipient.Number!));

        public Task<List<UserContactPoints>> GetUserContactPoints(List<string> nationalIdentityNumbers) =>
            Task.FromResult(nationalIdentityNumbers.Where(Users.ContainsKey).Select(nin => Users[nin]).ToList());

        public Task<List<OrganizationContactPoints>> GetUserRegisteredContactPoints(
            List<string> organizationNumbers,
            string resourceId
        ) => Task.FromResult(new List<OrganizationContactPoints>());

        public Task<List<OrganizationContactPoints>> GetOrganizationContactPoints(List<string> organizationNumbers) =>
            Task.FromResult(
                organizationNumbers.Where(Organizations.ContainsKey).Select(org => Organizations[org]).ToList()
            );
    }

    private async Task<Guid> InitializeAttachment()
    {
        var result = await _controller.InitializeAttachment(
            new InitializeAttachmentRequestDto
            {
                ResourceId = ResourceId,
                FileName = "signed.pdf",
                DisplayName = "Signed document",
                SendersReference = "senders-reference",
            }
        );
        return Assert.IsType<Guid>(Assert.IsType<OkObjectResult>(result).Value);
    }

    private async Task<AttachmentOverviewDto> UploadAttachment(Guid attachmentId, byte[] data) =>
        Assert.IsType<AttachmentOverviewDto>(Assert.IsType<OkObjectResult>(await Upload(attachmentId, data)).Value);

    private async Task<ActionResult> Upload(Guid attachmentId, byte[] data)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(data);
        httpContext.Request.ContentType = "application/pdf";
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return await _controller.UploadAttachment(attachmentId);
    }

    private async Task<InitializeCorrespondencesResponseDto> Initialize(JsonElement request)
    {
        var result = await _controller.InitializeCorrespondences(request);
        return Assert.IsType<InitializeCorrespondencesResponseDto>(
            Assert.IsType<OkObjectResult>(result).Value
        );
    }

    private async Task<ProblemDetails> InitializeProblem(JsonElement request)
    {
        var result = await _controller.InitializeCorrespondences(request);
        return Assert.IsType<ProblemDetails>(Assert.IsType<ObjectResult>(result).Value);
    }

    private static JsonElement Request(params string[] recipients) => Request(recipients, null);

    private static JsonElement Request(string recipient, Guid idempotentKey) =>
        Request([recipient], idempotentKey);

    private static JsonElement Request(string first, string second, Guid idempotentKey) =>
        Request([first, second], idempotentKey);

    private static JsonElement Request(
        IReadOnlyList<string> recipients,
        Guid? idempotentKey,
        IReadOnlyList<Guid>? attachments = null,
        Dictionary<string, object?>? notification = null,
        string? resourceId = ResourceId,
        string? messageTitle = "Task_1 is ready for signing",
        Action<Dictionary<string, object?>>? configure = null
    )
    {
        var body = new Dictionary<string, object?>
        {
            ["correspondence"] = new Dictionary<string, object?>
            {
                ["resourceId"] = resourceId,
                ["sendersReference"] = "senders-reference",
                ["messageSender"] = "Testdepartementet",
                ["content"] = new Dictionary<string, object?>
                {
                    ["language"] = "nb",
                    ["messageTitle"] = messageTitle,
                    ["messageSummary"] = "You have a document to sign",
                    ["messageBody"] = "Please sign the document.",
                },
                ["isConfirmationNeeded"] = false,
                ["isConfidential"] = false,
                ["notification"] = notification,
            },
            ["recipients"] = recipients,
            ["existingAttachments"] = attachments ?? [],
        };

        if (idempotentKey is not null)
        {
            body["idempotentKey"] = idempotentKey;
        }
        configure?.Invoke((Dictionary<string, object?>)body["correspondence"]!);

        return JsonDocument.Parse(JsonSerializer.Serialize(body)).RootElement;
    }

    public void Dispose()
    {
        _repository.Dispose();
        if (Directory.Exists(_storagePath))
        {
            Directory.Delete(_storagePath, recursive: true);
        }
    }
}
