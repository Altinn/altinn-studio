namespace Altinn.Notifications.Core.Enums;

/// <summary>
/// Enum describing sms notification result types
/// </summary>
public enum SmsNotificationResultType
{
    /// <summary>
    /// Default result for new notifications
    /// </summary>
    New,

    /// <summary>
    /// Sms notification being sent
    /// </summary>
    Sending,

    /// <summary>
    /// Sms notification sent to service provider
    /// </summary>
    Accepted,

    /// <summary>
    /// Sms notification was successfully delivered to destination.
    /// </summary>
    Delivered,

    /// <summary>
    /// Sms notification send operation failed
    /// </summary>
    Failed,

    /// <summary>
    /// Sms notification send operation failed due to invalid recipient
    /// </summary>
    Failed_InvalidRecipient,

    /// <summary>
    /// Failed, recipient is reserved in KRR
    /// </summary>
    Failed_RecipientReserved,

    /// <summary>
    /// Sms notification send operation failed because the receiver number is barred/blocked/not in use. 
    /// </summary>
    Failed_BarredReceiver,

    /// <summary>
    /// Sms notification send operation failed because the message has been deleted.
    /// </summary>
    Failed_Deleted,

    /// <summary>
    /// Sms notification send operation failed because the message validity period has expired.
    /// </summary>
    Failed_Expired,

    /// <summary>
    /// Sms notification send operation failed due to the SMS being undeliverable.
    /// </summary>
    Failed_Undelivered,

    /// <summary>
    /// Recipient mobile number was not identified
    /// </summary>
    Failed_RecipientNotIdentified,

    /// <summary>
    /// Message was rejected.
    /// </summary>
    Failed_Rejected
}
