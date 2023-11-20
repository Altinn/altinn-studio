#nullable enable
namespace Altinn.Notifications.Core.Enums;

/// <summary>
/// Enum describing email notification result types
/// </summary>
public enum EmailNotificationResultType
{
    /// <summary>
    /// Default result for new notifications
    /// </summary>
    New,

    /// <summary>
    /// Email notification being sent
    /// </summary>
    Sending,

    /// <summary>
    /// Email notification sent
    /// </summary>
    Succeeded,

    /// <summary>
    /// Email delivered to recipient
    /// </summary>
    Delivered,

    /// <summary>
    /// Failed, unknown reason
    /// </summary>
    Failed,

    /// <summary>
    /// Recipient to address was not identified
    /// </summary>
    Failed_RecipientNotIdentified,

    /// <summary>
    /// Invalid format for email address
    /// </summary>
    Failed_InvalidEmailFormat
}
