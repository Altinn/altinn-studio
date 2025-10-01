namespace Altinn.App.Core.Features.Signing;

/// <summary>
/// Enumeration representing the choice of notification method for a signee.
/// </summary>
public enum NotificationChoice
{
    /// <summary>
    /// No notification.
    /// </summary>
    None = 0,

    /// <summary>
    /// Notify via email.
    /// </summary>
    Email = 1,

    /// <summary>
    /// Notify via SMS.
    /// </summary>
    Sms = 2,

    /// <summary>
    /// Notify via both email and SMS.
    /// </summary>
    SmsAndEmail = 3,

    /// <summary>
    /// Sms preference, but fallback to email if SMS is not available.
    /// </summary>
    SmsPreferred = 4,

    /// <summary>
    /// Email preference, but fallback to SMS if email is not available.
    /// </summary>
    EmailPreferred = 5,
}
