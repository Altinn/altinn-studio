using System.Text.Json;
using Altinn.Correspondence.Controllers;
using LocalTest.Configuration;
using LocalTest.Models;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LocalTest.Controllers;

/// <summary>
/// Shows what apps have sent through the emulated Correspondence and Notifications APIs: the messages, their
/// attachments, and the emails and SMS messages that would have gone out.
/// </summary>
public class MessagesController(LocalCorrespondenceRepository repository, IOptions<LocalPlatformSettings> settings)
    : Controller
{
    private static readonly JsonSerializerOptions _requestOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };

    private static readonly JsonSerializerOptions _indented = new() { WriteIndented = true };

    public async Task<IActionResult> Index()
    {
        var correspondences = (await repository.Read()).OrderByDescending(item => item.Created).ToList();
        return View(new MessagesViewModel(correspondences, await ReadNotificationOrders()));
    }

    public async Task<IActionResult> Details(Guid id)
    {
        var correspondence = await repository.Find(id);
        if (correspondence is null)
        {
            return NotFound();
        }

        var attachments = new List<StoredAttachment>();
        foreach (var attachmentId in correspondence.AttachmentIds)
        {
            if (await repository.FindAttachment(attachmentId) is { } attachment)
            {
                attachments.Add(attachment);
            }
        }

        return View(
            new CorrespondenceViewModel(
                correspondence,
                StoredRequest(correspondence),
                attachments,
                JsonSerializer.Serialize(correspondence.Request, _indented)
            )
        );
    }

    public async Task<IActionResult> Attachment(Guid id)
    {
        var attachment = await repository.FindAttachment(id);
        var data = attachment is null ? null : repository.OpenAttachmentData(id);
        if (attachment is null || data is null)
        {
            return NotFound();
        }

        // The result disposes the stream once it is sent
        return File(
            data,
            attachment.DataType ?? "application/octet-stream",
            attachment.Request.FileName ?? $"{id}.bin"
        );
    }

    /// <summary>
    /// Deletes what this page shows: the stored correspondence with its attachments, and the notification orders.
    /// Nothing else Localtest stores is touched, so a developer can start over without resetting the environment.
    /// </summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Clear()
    {
        await repository.Clear();

        var orders = NotificationOrdersDirectory();
        if (orders.Exists)
        {
            foreach (var file in orders.GetFiles("*.json"))
            {
                file.Delete();
            }
        }

        return RedirectToAction(nameof(Index));
    }

    /// <summary>
    /// The correspondence part of the request a record was created from, or <c>null</c> when the stored request is
    /// in a shape this version of Localtest does not know. The raw request is still shown.
    /// </summary>
    private static CorrespondenceRequestDto? StoredRequest(StoredCorrespondence correspondence)
    {
        try
        {
            return correspondence
                .Request.Deserialize<InitializeCorrespondencesRequestDto>(_requestOptions)
                ?.Correspondence;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Reads the orders the emulated Notifications API stored. Read as plain JSON, so an order in an older or
    /// unexpected shape is still shown as far as it goes rather than hiding the rest.
    /// </summary>
    private async Task<IReadOnlyList<NotificationOrderView>> ReadNotificationOrders()
    {
        var directory = NotificationOrdersDirectory();
        if (!directory.Exists)
        {
            return [];
        }

        var orders = new List<NotificationOrderView>();
        foreach (var file in directory.GetFiles("*.json"))
        {
            try
            {
                using var document = JsonDocument.Parse(await System.IO.File.ReadAllTextAsync(file.FullName));
                if (document.RootElement.ValueKind == JsonValueKind.Object)
                {
                    orders.Add(ToView(document.RootElement));
                }
            }
            catch (JsonException)
            {
                // A file that is not an order is not ours to show.
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                // The Notifications API may be writing the file right now, or it is gone; the rest still shows.
            }
        }

        return [.. orders.OrderByDescending(order => order.Created)];
    }

    /// <summary>Where the emulated Notifications API stores its orders, one JSON file per order.</summary>
    private DirectoryInfo NotificationOrdersDirectory() =>
        new(
            Path.Join(
                settings.Value.LocalTestingStorageBasePath,
                settings.Value.NotificationsStorageFolder,
                "orders"
            )
        );

    private static NotificationOrderView ToView(JsonElement order)
    {
        var recipients = new List<string>();
        foreach (var recipient in Array(order, "recipients"))
        {
            string? owner = String(recipient, "nationalIdentityNumber") is { } nationalIdentityNumber
                ? $"person {nationalIdentityNumber}"
                : String(recipient, "organizationNumber") is { } org
                    ? $"organization {org}"
                    : null;
            var addresses = Array(recipient, "addressInfo")
                .Select(address => String(address, "emailAddress") ?? String(address, "mobileNumber"))
                .OfType<string>()
                .ToList();
            recipients.Add(
                addresses.Count == 0 ? owner ?? "(unknown)"
                    : owner is null ? string.Join(", ", addresses)
                    : $"{string.Join(", ", addresses)} ({owner})"
            );
        }

        var templates = Array(order, "templates")
            .Select(template =>
                String(template, "subject") is { } subject
                    ? new NotificationTemplateView("Email", subject, String(template, "body") ?? string.Empty)
                    : new NotificationTemplateView("SMS", null, String(template, "body") ?? string.Empty)
            )
            .ToList();

        return new NotificationOrderView(
            Guid.TryParse(String(order, "id"), out var id) ? id : Guid.Empty,
            Time(order, "created"),
            Time(order, "requestedSendTime"),
            String(order, "notificationChannel") ?? "Unknown",
            String(order, "sendersReference"),
            String(order, "resourceId"),
            recipients,
            templates
        );
    }

    private static IEnumerable<JsonElement> Array(JsonElement element, string property) =>
        element.ValueKind == JsonValueKind.Object
        && element.TryGetProperty(property, out var value)
        && value.ValueKind == JsonValueKind.Array
            ? value.EnumerateArray()
            : [];

    private static string? String(JsonElement element, string property) =>
        element.ValueKind == JsonValueKind.Object
        && element.TryGetProperty(property, out var value)
        && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static DateTimeOffset Time(JsonElement element, string property) =>
        DateTimeOffset.TryParse(String(element, property), out var time) ? time : DateTimeOffset.MinValue;
}
