#nullable enable
namespace Altinn.Notifications.Core.Configuration;

/// <summary>
/// Configuration class for notification orders
/// </summary>
public class NotificationOrderConfig
{
    /// <summary>
    /// Default from address for email notifications
    /// </summary>
    public string DefaultEmailFromAddress { get; set; } = string.Empty;

    /// <summary>
    /// Default sender number for sms notifications
    /// </summary>
    public string DefaultSmsSenderNumber { get; set; } = string.Empty;
}
