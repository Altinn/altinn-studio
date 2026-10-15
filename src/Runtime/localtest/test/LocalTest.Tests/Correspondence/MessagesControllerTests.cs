using System.Text.Json;
using Altinn.Correspondence.Controllers;
using LocalTest.Configuration;
using LocalTest.Controllers;
using LocalTest.Models;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Mvc;
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
        _repository = new LocalCorrespondenceRepository(settings);
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
        await _repository.UploadAttachment(attachment.AttachmentId, [1, 2, 3], "application/pdf");
        var id = await Store("With attachment", DateTimeOffset.UtcNow, [attachment.AttachmentId]);

        var model = Assert.IsType<CorrespondenceViewModel>(
            Assert.IsType<ViewResult>(await _controller.Details(id)).Model
        );
        var file = Assert.IsType<FileContentResult>(await _controller.Attachment(attachment.AttachmentId));

        Assert.Equal("With attachment", model.Request?.Content?.MessageTitle);
        Assert.Equal("signed.pdf", Assert.Single(model.Attachments).Request.FileName);
        Assert.Equal([1, 2, 3], file.FileContents);
        Assert.Equal("application/pdf", file.ContentType);
        Assert.Equal("signed.pdf", file.FileDownloadName);
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
        Assert.Equal("No contact information", MessagesDisplay.Summary([Order(false, 0), Order(true, 0)]));
        Assert.Equal("2 emails, reminder", MessagesDisplay.Summary([Order(false, 1), Order(true, 1)]));
    }

    private async Task<Guid> Store(string title, DateTimeOffset created, IReadOnlyList<Guid>? attachments = null)
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
            Recipient = "urn:altinn:person:identifier-no:01899699552",
            ResourceId = "resource",
            SendersReference = "reference",
            Sender = "991825827",
            Status = CorrespondenceStatus.Published,
            Created = created,
            Published = created,
            AttachmentIds = attachments ?? [],
            Request = request,
        };
        Assert.True(await _repository.TryCreate(null, [correspondence]));
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
