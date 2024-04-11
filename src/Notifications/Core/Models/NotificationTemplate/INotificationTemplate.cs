#nullable enable
using System.Text.Json.Serialization;

using Altinn.Notifications.Core.Enums;

namespace Altinn.Notifications.Core.Models.NotificationTemplate;

/// <summary>
/// Base class for a notification template
/// </summary>
[JsonDerivedType(typeof(EmailTemplate), "email")]
[JsonDerivedType(typeof(SmsTemplate), "sms")]
[JsonPolymorphic(TypeDiscriminatorPropertyName = "$")]
public interface INotificationTemplate
{
    /// <summary>
    /// Gets the type for the template
    /// </summary>
    public NotificationTemplateType Type { get; }
}
