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
    /// Failed, recipient is reserved in KRR
    /// </summary>
    Failed_RecipientReserved,

    /// <summary>
    /// Recipient to address was not identified
    /// </summary>
    Failed_RecipientNotIdentified,

    /// <summary>
    /// Invalid format for email address
    /// </summary>
    Failed_InvalidEmailFormat,

    /// <summary>
    /// Recipient supressed by email service
    /// </summary>
    Failed_SupressedRecipient,

    /// <summary>
    /// Transient error, retry later
    /// </summary>
    /// <remarks>
    /// Should not be used externally or persisted in db.
    /// Only used for processing and logic in service layer.</remarks>
    Failed_TransientError,

    /// <summary>
    /// Failed, bounced
    /// </summary>
    Failed_Bounced,

    /// <summary>
    /// Failed, filtered spam
    /// </summary>
    Failed_FilteredSpam,

    /// <summary>
    /// Failed, quarantined
    /// </summary>
    Failed_Quarantined
}
