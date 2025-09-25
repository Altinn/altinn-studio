using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// The status of a correspondence notification.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceNotificationStatusResponse
{
    /// <summary>
    /// Notification has been scheduled successfully.
    /// </summary>
    Success,

    /// <summary>
    /// Notification cannot be delivered because of missing contact information.
    /// </summary>
    MissingContact,

    /// <summary>
    /// Notification has failed.
    /// </summary>
    Failure,
}
