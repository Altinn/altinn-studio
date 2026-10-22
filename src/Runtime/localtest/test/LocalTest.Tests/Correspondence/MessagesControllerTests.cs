using System.Text.Json;
using Altinn.Correspondence.Controllers;
using OrderChannel = Altinn.Notifications.Core.Enums.NotificationChannel;
using Altinn.Notifications.Core.Models;
using Altinn.Notifications.Core.Models.Address;
using Altinn.Notifications.Core.Models.NotificationTemplate;
using Altinn.Notifications.Core.Models.Orders;
using LocalTest.Notifications.Persistence.Repository;
using LocalTest.Configuration;
using LocalTest.Controllers;
using LocalTest.Models;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests.Correspondence;

public sealed class MessagesControllerTests : IDisposable
{
    private readonly string _storagePath = Path.Join(Path.GetTempPath(), $"localtest-messages-{Guid.NewGuid():N}");
    private readonly LocalCorrespondenceRepository _repository;
    private readonly MessagesController _controller;

    public MessagesControllerTests()
    {
        var settings = Options.Create(
            new LocalPlatformSettings { LocalTestingStorageBasePath = _storagePath + Path.DirectorySeparatorChar }
        );
        _repository = new LocalCorrespondenceRepository(settings, NullLogger<LocalCorrespondenceRepository>.Instance);
        _controller = new MessagesController(_repository, settings);
    }

    public void Dispose()
    {
        _repository.Dispose();
        if (Directory.Exists(_storagePath))
        {
            Directory.Delete(_storagePath, recursive: true);
        }
    }

    [Fact]
    public async Task Index_ListsCorrespondenceNewestFirst_AndNotificationOrders()
    {
        var older = await Store("Older", DateTimeOffset.UtcNow.AddMinutes(-5));
        var newer = await Store("Newer", DateTimeOffset.UtcNow);
        WriteNotificationOrder();

        var model = Assert.IsType<MessagesViewModel>(Assert.IsType<ViewResult>(await _controller.Index()).Model);

        Assert.Equal([newer, older], model.Correspondences.Select(item => item.CorrespondenceId));
        Assert.Equal("Newer", MessagesDisplay.Title(model.Correspondences[0]));
        var order = Assert.Single(model.NotificationOrders);
        Assert.Equal("Email", order.Channel);
        Assert.Equal(["user@example.com (person 01899699552)"], order.Recipients);
        Assert.Equal("Hello", Assert.Single(order.Templates).Subject);
    }

    [Fact]
    public async Task Details_ShowsTheCorrespondenceAndItsAttachments()
    {
        var attachment = await _repository.CreateAttachment(
            new InitializeAttachmentRequestDto
            {
                ResourceId = "resource",
                SendersReference = "reference",
                FileName = "signed.pdf",
            }
        );
        await _repository.UploadAttachment(attachment.AttachmentId, new MemoryStream([1, 2, 3]), "application/pdf");
        var id = await Store("With attachment", DateTimeOffset.UtcNow, [attachment.AttachmentId]);

        var model = Assert.IsType<CorrespondenceViewModel>(
            Assert.IsType<ViewResult>(await _controller.Details(id)).Model
        );
        var file = Assert.IsType<FileStreamResult>(await _controller.Attachment(attachment.AttachmentId));
        using var downloaded = new MemoryStream();
        await using (file.FileStream)
        {
            await file.FileStream.CopyToAsync(downloaded);
        }

        Assert.Equal("With attachment", model.Request?.Content?.MessageTitle);
        Assert.Equal("signed.pdf", Assert.Single(model.Attachments).Request.FileName);
        Assert.Equal([1, 2, 3], downloaded.ToArray());
        Assert.Equal("application/pdf", file.ContentType);
        Assert.Equal("signed.pdf", file.FileDownloadName);
    }

    [Fact]
    public async Task IndexAndDetails_RecordFromAnOlderLocaltest_StillShow()
    {
        var id = Guid.NewGuid();
        Directory.CreateDirectory(Path.Join(_storagePath, "correspondence"));
        await File.WriteAllTextAsync(
            Path.Join(_storagePath, "correspondence", $"{id}.json"),
            $$"""
            {
              "correspondenceId": "{{id}}",
              "recipient": "urn:altinn:person:identifier-no:01899699552",
              "resourceId": "resource",
              "sendersReference": "reference",
              "status": "Initialized",
              "created": "2026-09-11T08:11:15.5997297+00:00",
              "request": { "correspondence": { "content": "not an object" } }
            }
            """
        );

        var index = Assert.IsType<MessagesViewModel>(Assert.IsType<ViewResult>(await _controller.Index()).Model);
        var details = Assert.IsType<CorrespondenceViewModel>(
            Assert.IsType<ViewResult>(await _controller.Details(id)).Model
        );

        Assert.Equal("(no title)", MessagesDisplay.Title(Assert.Single(index.Correspondences)));
        Assert.Null(details.Request);
        Assert.Contains("not an object", details.RawRequest);
    }

    [Fact]
    public async Task Index_NotificationOrderInAnUnexpectedShape_StillLists()
    {
        var orders = Path.Join(_storagePath, "notifications", "orders");
        Directory.CreateDirectory(orders);
        await File.WriteAllTextAsync(Path.Join(orders, "array.json"), "[1, 2]");
        await File.WriteAllTextAsync(
            Path.Join(orders, "odd.json"),
            """{ "recipients": ["not an object"], "templates": [42] }"""
        );
        await File.WriteAllTextAsync(Path.Join(orders, "broken.json"), "not json");

        var model = Assert.IsType<MessagesViewModel>(Assert.IsType<ViewResult>(await _controller.Index()).Model);

        var order = Assert.Single(model.NotificationOrders);
        Assert.Equal("Unknown", order.Channel);
    }

    [Fact]
    public async Task Index_OrderTheNotificationsApiStored_ShowsItsChannelAndContent()
    {
        var settings = Options.Create(
            new LocalPlatformSettings { LocalTestingStorageBasePath = _storagePath + Path.DirectorySeparatorChar }
        );
        await new LocalOrderRepository(settings).Create(
            new NotificationOrder(
                Guid.NewGuid(),
                "ref",
                [new SmsTemplate(null, "Your form is ready")],
                DateTime.UtcNow,
                OrderChannel.Sms,
                new Creator("ttd"),
                DateTime.UtcNow,
                [new Recipient([new SmsAddressPoint("+4799999999")], organizationNumber: "991825827")],
                null,
                "resource"
            )
        );

        var model = Assert.IsType<MessagesViewModel>(Assert.IsType<ViewResult>(await _controller.Index()).Model);

        var order = Assert.Single(model.NotificationOrders);
        Assert.Equal("Sms", order.Channel);
        Assert.Equal("+4799999999 (organization 991825827)", Assert.Single(order.Recipients));
        var template = Assert.Single(order.Templates);
        Assert.Equal("SMS", template.Kind);
        Assert.Equal("Your form is ready", template.Body);
    }

    [Fact]
    public async Task Index_NotificationOrderFileThatCannotBeRead_IsSkipped()
    {
        WriteNotificationOrder();
        var locked = Path.Join(_storagePath, "notifications", "orders", "being-written.json");
        await File.WriteAllTextAsync(locked, """{ "id": "00000000-0000-0000-0000-000000000001" }""");

        // As if the Notifications API held the file open while writing it
        IActionResult result;
        using (new FileStream(locked, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
        {
            result = await _controller.Index();
        }

        var model = Assert.IsType<MessagesViewModel>(Assert.IsType<ViewResult>(result).Model);
        Assert.Equal("Email", Assert.Single(model.NotificationOrders).Channel);
    }

    [Fact]
    public async Task Index_CorrespondenceFileThatCannotBeRead_IsSkipped()
    {
        await Store("Readable", DateTimeOffset.UtcNow);
        var locked = Path.Join(_storagePath, "correspondence", $"{await Store("Locked", DateTimeOffset.UtcNow)}.json");

        // As if another request held the file, or Clear deleted it after Index listed it
        IActionResult result;
        using (new FileStream(locked, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
        {
            result = await _controller.Index();
        }

        var model = Assert.IsType<MessagesViewModel>(Assert.IsType<ViewResult>(result).Model);
        Assert.Equal("Readable", MessagesDisplay.Title(Assert.Single(model.Correspondences)));
    }

    [Fact]
    public async Task Details_RecordWithoutAStoredRequest_StillShows()
    {
        var id = Guid.NewGuid();
        Directory.CreateDirectory(Path.Join(_storagePath, "correspondence"));
        await File.WriteAllTextAsync(
            Path.Join(_storagePath, "correspondence", $"{id}.json"),
            $$"""
            {
              "correspondenceId": "{{id}}",
              "recipient": "urn:altinn:person:identifier-no:01899699552",
              "resourceId": "resource",
              "sendersReference": "reference",
              "status": "Initialized",
              "created": "2026-09-11T08:11:15.5997297+00:00"
            }
            """
        );

        var details = Assert.IsType<CorrespondenceViewModel>(
            Assert.IsType<ViewResult>(await _controller.Details(id)).Model
        );

        Assert.Null(details.Request);
        Assert.Equal("(no request stored)", details.RawRequest);
    }

    [Fact]
    public async Task Details_UnknownCorrespondence_IsNotFound()
    {
        Assert.IsType<NotFoundResult>(await _controller.Details(Guid.NewGuid()));
        Assert.IsType<NotFoundResult>(await _controller.Attachment(Guid.NewGuid()));
    }

    [Fact]
    public void Summary_DescribesWhatWasSent()
    {
        var recipient = new NotificationRecipientDto { EmailAddress = "user@example.com" };
        StoredNotification Order(bool reminder, int emails) =>
            new()
            {
                IsReminder = reminder,
                Emails = [.. Enumerable.Range(0, emails).Select(_ => new SentEmail { Recipient = recipient, Subject = "", Body = "" })],
            };

        Assert.Equal("None ordered", MessagesDisplay.Summary([]));
        Assert.Equal("None ordered", MessagesDisplay.Summary(null));
        Assert.Equal("No contact information", MessagesDisplay.Summary([Order(false, 0), Order(true, 0)]));
        Assert.Equal("2 emails, reminder", MessagesDisplay.Summary([Order(false, 1), Order(true, 1)]));
    }

    [Fact]
    public async Task Clear_DeletesMessagesAttachmentsAndNotificationOrders_AndNothingElse()
    {
        var attachment = await _repository.CreateAttachment(
            new InitializeAttachmentRequestDto
            {
                ResourceId = "resource",
                SendersReference = "reference",
                FileName = "signed.pdf",
            }
        );
        await _repository.UploadAttachment(attachment.AttachmentId, new MemoryStream([1, 2, 3]), "application/pdf");
        await Store("With attachment", DateTimeOffset.UtcNow, [attachment.AttachmentId]);
        WriteNotificationOrder();
        var instanceData = Path.Join(_storagePath, "blobs", "instance-data.txt");
        Directory.CreateDirectory(Path.GetDirectoryName(instanceData)!);
        await File.WriteAllTextAsync(instanceData, "kept");

        var result = await _controller.Clear();

        Assert.Equal(nameof(MessagesController.Index), Assert.IsType<RedirectToActionResult>(result).ActionName);
        var model = Assert.IsType<MessagesViewModel>(Assert.IsType<ViewResult>(await _controller.Index()).Model);
        Assert.Empty(model.Correspondences);
        Assert.Empty(model.NotificationOrders);
        Assert.Null(await _repository.FindAttachment(attachment.AttachmentId));
        Assert.Null(_repository.OpenAttachmentData(attachment.AttachmentId));
        Assert.True(File.Exists(instanceData));
    }

    [Fact]
    public async Task Clear_ForgetsIdempotentKeys()
    {
        var idempotentKey = Guid.NewGuid();
        await Store("Sent", DateTimeOffset.UtcNow, idempotentKey: idempotentKey);

        await _controller.Clear();

        // Store asserts that the key is accepted, which it would not be while the first message is kept
        await Store("Sent again", DateTimeOffset.UtcNow, idempotentKey: idempotentKey);
    }

    private async Task<Guid> Store(
        string title,
        DateTimeOffset created,
        IReadOnlyList<Guid>? attachments = null,
        Guid? idempotentKey = null
    )
    {
        var request = JsonSerializer.SerializeToElement(
            new
            {
                correspondence = new
                {
                    resourceId = "resource",
                    sendersReference = "reference",
                    content = new { language = "nb", messageTitle = title, messageBody = "Body" },
                },
                recipients = new[] { "urn:altinn:person:identifier-no:01899699552" },
            }
        );
        var correspondence = new StoredCorrespondence
        {
            CorrespondenceId = Guid.NewGuid(),
            IdempotentKey = idempotentKey,
            Recipient = "urn:altinn:person:identifier-no:01899699552",
            ResourceId = "resource",
            SendersReference = "reference",
            Status = CorrespondenceStatus.Published,
            Created = created,
            Published = created,
            AttachmentIds = attachments ?? [],
            Request = request,
        };
        Assert.True(await _repository.TryCreate(idempotentKey, [correspondence]));
        return correspondence.CorrespondenceId;
    }

    private void WriteNotificationOrder()
    {
        var directory = Directory.CreateDirectory(Path.Join(_storagePath, "notifications", "orders"));
        File.WriteAllText(
            Path.Join(directory.FullName, $"{Guid.NewGuid()}.json"),
            """
            {
              "id": "7c9f2a53-4f86-4d3e-9c63-28b1f7b0b1a4",
              "created": "2026-10-15T08:00:00Z",
              "requestedSendTime": "2026-10-15T08:00:00Z",
              "notificationChannel": "Email",
              "sendersReference": "ref",
              "templates": [{ "$": "email", "subject": "Hello", "body": "World" }],
              "recipients": [
                {
                  "nationalIdentityNumber": "01899699552",
                  "addressInfo": [{ "$": "email", "emailAddress": "user@example.com" }]
                }
              ]
            }
            """
        );
        File.WriteAllText(Path.Join(directory.FullName, "broken.json"), "{ not json");
    }
}
