using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Available notification channels (methods).
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceNotificationChannel
{
    /// <summary>
    /// The selected channel for the notification is email.
    /// </summary>
    Email,

    /// <summary>
    /// The selected channel for the notification is sms.
    /// </summary>
    Sms,

    /// <summary>
    /// The selected channel for the notification is email preferred.
    /// </summary>
    EmailPreferred,

    /// <summary>
    /// The selected channel for the notification is SMS preferred.
    /// </summary>
    SmsPreferred,
}
