#nullable enable
using Altinn.Notifications.Core.Enums;

namespace Altinn.Notifications.Core.Models.NotificationTemplate;

/// <summary>
/// Template for an email notification
/// </summary>
public class EmailTemplate : INotificationTemplate
{
    /// <inheritdoc/>
    public NotificationTemplateType Type { get; internal set; }

    /// <summary>
    /// Gets the from adress of emails created by the template    
    /// </summary>
    public string FromAddress { get; internal set; } = string.Empty;

    /// <summary>
    /// Gets the subject of emails created by the template    
    /// </summary>
    public string Subject { get; internal set; } = string.Empty;

    /// <summary>
    /// Gets the body of emails created by the template    
    /// </summary>
    public string Body { get; internal set; } = string.Empty;

    /// <summary>
    /// Gets the content type of emails created by the template
    /// </summary>
    public EmailContentType ContentType { get; internal set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="EmailTemplate"/> class.
    /// </summary>
    public EmailTemplate(string? fromAddress, string subject, string body, EmailContentType contentType)
    {
        FromAddress = fromAddress ?? string.Empty;
        Subject = subject;
        Body = body;
        ContentType = contentType;
        Type = NotificationTemplateType.Email;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="EmailTemplate"/> class.
    /// </summary>
    internal EmailTemplate()
    {
    }
}
