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
            new CorrespondenceNotificationBuilder(_contacts, _contacts)
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
        Assert.Equal("A correspondence with the same idempotent key already exists", problem.Title);
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
        Assert.Contains("multiple recipients", problem.Detail);
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

    private static Dictionary<string, object?> Notification(string channel) =>
        new()
        {
            ["notificationTemplate"] = "CustomMessage",
            ["emailSubject"] = "Sign the document",
            ["emailBody"] = "You have a document to sign in Altinn.",
            ["smsBody"] = "You have a document to sign in Altinn.",
            ["notificationChannel"] = channel,
        };

    private sealed class FakeContacts : IProfileClient, IRegisterClient
    {
        public Dictionary<string, UserContactPoints> Users { get; } = [];
        public Dictionary<string, OrganizationContactPoints> Organizations { get; } = [];

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
        string? messageTitle = "Task_1 is ready for signing"
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
