#nullable enable
using Altinn.Notifications.Core.Enums;

namespace Altinn.Notifications.Core.Models.NotificationTemplate;

/// <summary>
/// Template for an SMS notification
/// </summary>
public class SmsTemplate : INotificationTemplate
{
    /// <inheritdoc/>
    public NotificationTemplateType Type { get; internal set; }

    /// <summary>
    /// Gets the number from which the SMS is created by the template    
    /// </summary>
    public string SenderNumber { get; internal set; } = string.Empty;

    /// <summary>
    /// Gets the body of SMSs created by the template    
    /// </summary>
    public string Body { get; internal set; } = string.Empty;

    /// <summary>
    /// Initializes a new instance of the <see cref="SmsTemplate"/> class.
    /// </summary>
    public SmsTemplate(string? senderNumber, string body)
    {
        SenderNumber = senderNumber ?? string.Empty;
        Body = body;
        Type = NotificationTemplateType.Sms;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="SmsTemplate"/> class.
    /// </summary>
    internal SmsTemplate()
    {
    }
}
