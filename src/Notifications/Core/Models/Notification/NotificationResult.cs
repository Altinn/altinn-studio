#nullable enable
namespace Altinn.Notifications.Core.Models.Notification;

/// <summary>
/// A class represednting a notification result
/// </summary>
public class NotificationResult<TEnum>
    where TEnum : struct, Enum
{
    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationResult{TEnum}"/> class.
    /// </summary>
    public NotificationResult(TEnum result, DateTime resultTime)
    {
        ResultTime = resultTime;
        Result = result;
    }

    /// <summary>
    /// Sets the result description
    /// </summary>
    public void SetResultDescription(string? description)
    {
        ResultDescription = description;
    }

    /// <summary>
    /// Gets the date and time for when the last result was set.
    /// </summary>
    public DateTime ResultTime { get; }

    /// <summary>
    /// Gets the send result of the notification
    /// </summary>
    public TEnum Result { get; }

    /// <summary>
    /// Gets the description of the send result
    /// </summary>
    public string? ResultDescription { get; private set; }
}
