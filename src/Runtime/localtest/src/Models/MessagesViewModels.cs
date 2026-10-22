using Altinn.Correspondence.Controllers;
using LocalTest.Services.Correspondence;

namespace LocalTest.Models;

/// <summary>Everything apps have sent through the emulated Correspondence and Notifications APIs.</summary>
public sealed record MessagesViewModel(
    IReadOnlyList<StoredCorrespondence> Correspondences,
    IReadOnlyList<NotificationOrderView> NotificationOrders
);

/// <summary>One correspondence, with what its request said and the attachments it references.</summary>
public sealed record CorrespondenceViewModel(
    StoredCorrespondence Correspondence,
    CorrespondenceRequestDto? Request,
    IReadOnlyList<StoredAttachment> Attachments,
    string RawRequest
);

/// <summary>
/// An email or SMS order an app placed directly with the Notifications API, as opposed to the notifications a
/// correspondence orders.
/// </summary>
public sealed record NotificationOrderView(
    Guid Id,
    DateTimeOffset Created,
    DateTimeOffset RequestedSendTime,
    string Channel,
    string? SendersReference,
    string? ResourceId,
    IReadOnlyList<string> Recipients,
    IReadOnlyList<NotificationTemplateView> Templates
);

/// <summary>The text of an email or SMS order.</summary>
public sealed record NotificationTemplateView(string Kind, string? Subject, string Body);

/// <summary>Display helpers shared by the messages views.</summary>
public static class MessagesDisplay
{
    /// <summary>A correspondence recipient as "Person …" or "Organization …", or as sent when it is neither.</summary>
    public static string Recipient(string recipient) =>
        CorrespondenceRecipient.TryParse(recipient) switch
        {
            { NationalIdentityNumber: { } nationalIdentityNumber } => $"Person {nationalIdentityNumber}",
            { OrganizationNumber: { } organizationNumber } => $"Organization {organizationNumber}",
            _ => recipient,
        };

    /// <summary>A notification recipient's address and who it belongs to.</summary>
    public static string Recipient(NotificationRecipientDto recipient)
    {
        string address = recipient.EmailAddress ?? recipient.MobileNumber ?? "(no address)";
        string? owner = recipient.NationalIdentityNumber is { } nationalIdentityNumber
            ? $"person {nationalIdentityNumber}"
            : recipient.OrganizationNumber is { } org
                ? $"organization {org}"
                : null;
        return owner is null ? address : $"{address} ({owner})";
    }

    /// <summary>A short summary of what a correspondence's notifications sent.</summary>
    public static string Summary(IReadOnlyList<StoredNotification>? notifications)
    {
        if (notifications is null || notifications.Count == 0)
        {
            return "None ordered";
        }

        int emails = notifications.Sum(notification => notification.Emails.Count);
        int smses = notifications.Sum(notification => notification.Smses.Count);
        if (emails + smses == 0)
        {
            return "No contact information";
        }

        var parts = new List<string>();
        if (emails > 0)
            parts.Add(emails == 1 ? "1 email" : $"{emails} emails");
        if (smses > 0)
            parts.Add(smses == 1 ? "1 SMS" : $"{smses} SMS");
        if (notifications.Any(notification => notification.IsReminder))
            parts.Add("reminder");
        return string.Join(", ", parts);
    }

    /// <summary>The correspondence's title, from the request the app sent.</summary>
    /// <summary>
    /// The title the app gave the message. Read from the stored request as plain JSON, so a request in a shape
    /// this version of Localtest does not know still lists.
    /// </summary>
    public static string Title(StoredCorrespondence correspondence) =>
        Property(Property(Property(correspondence.Request, "correspondence"), "content"), "messageTitle")
            is { ValueKind: System.Text.Json.JsonValueKind.String } title
        && title.GetString() is { Length: > 0 } text
            ? text
            : "(no title)";

    private static System.Text.Json.JsonElement Property(System.Text.Json.JsonElement element, string name) =>
        element.ValueKind == System.Text.Json.JsonValueKind.Object && element.TryGetProperty(name, out var value)
            ? value
            : default;

    public static string Time(DateTimeOffset time) => time.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");

    public static string Size(long? bytes) =>
        bytes switch
        {
            null => "",
            < 1024 => $"{bytes} B",
            < 1024 * 1024 => $"{bytes / 1024.0:0.#} KB",
            _ => $"{bytes / (1024.0 * 1024):0.#} MB",
        };
}
