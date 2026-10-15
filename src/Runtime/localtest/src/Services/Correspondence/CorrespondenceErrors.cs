namespace LocalTest.Services.Correspondence;

/// <summary>
/// An error the Correspondence API answers with. The code and message are the ones the real API uses, so an app
/// sees the same error locally as in a deployed environment. Errors the real API reports from its request model
/// validation have no code.
/// </summary>
public sealed record CorrespondenceError(int StatusCode, string Message, int? ErrorCode = null);

/// <summary>
/// The errors the local Correspondence API reports, copied from the Correspondence API's error catalog.
/// </summary>
internal static class CorrespondenceErrors
{
    public static readonly CorrespondenceError CorrespondenceNotFound = new(
        StatusCodes.Status404NotFound,
        "The requested correspondence was not found",
        1001
    );
    public static readonly CorrespondenceError MessageTitleIsNotPlainText = new(
        StatusCodes.Status400BadRequest,
        "Message title must be plain text",
        1002
    );
    public static readonly CorrespondenceError DuplicateRecipients = new(
        StatusCodes.Status400BadRequest,
        "Recipients must be unique",
        1006
    );
    public static readonly CorrespondenceError ExistingAttachmentNotFound = new(
        StatusCodes.Status400BadRequest,
        "Existing attachment not found",
        1007
    );
    public static readonly CorrespondenceError DueDatePriorToday = new(
        StatusCodes.Status400BadRequest,
        "DueDateTime cannot be prior to today",
        1008
    );
    public static readonly CorrespondenceError DueDatePriorRequestedPublishTime = new(
        StatusCodes.Status400BadRequest,
        "DueDateTime cannot be prior to RequestedPublishTime",
        1009
    );
    public static readonly CorrespondenceError DueDateRequired = new(
        StatusCodes.Status400BadRequest,
        "DueDateTime is required when confirmation is needed",
        1016
    );
    public static readonly CorrespondenceError AttachmentsNotPublished = new(
        StatusCodes.Status400BadRequest,
        "Attachment is not published",
        1018
    );
    public static readonly CorrespondenceError MissingContent = new(
        StatusCodes.Status400BadRequest,
        "The Content field must be provided for the correspondence",
        1019
    );
    public static readonly CorrespondenceError MessageTitleEmpty = new(
        StatusCodes.Status400BadRequest,
        "Message title cannot be empty",
        1020
    );
    public static readonly CorrespondenceError MessageBodyEmpty = new(
        StatusCodes.Status400BadRequest,
        "Message body cannot be empty",
        1021
    );
    public static readonly CorrespondenceError MessageBodyTooLong = new(
        StatusCodes.Status400BadRequest,
        "Message body cannot exceed 30000 characters",
        1022
    );
    public static readonly CorrespondenceError InvalidLanguage = new(
        StatusCodes.Status400BadRequest,
        "Invalid language chosen. Supported languages is Norsk bokmål (nb), Nynorsk (nn) and English (en)",
        1023
    );
    public static readonly CorrespondenceError InvalidIdempotencyKey = new(
        StatusCodes.Status400BadRequest,
        "The idempotency key must be a valid non-empty GUID",
        1033
    );
    public static readonly CorrespondenceError DuplicateInitCorrespondenceRequest = new(
        StatusCodes.Status409Conflict,
        "A correspondence with the same idempotent key already exists",
        1034
    );
    public static readonly CorrespondenceError MessageTitleTooLong = new(
        StatusCodes.Status400BadRequest,
        "Message title cannot exceed 255 characters",
        1037
    );
    public static readonly CorrespondenceError AttachmentCountExceeded = new(
        StatusCodes.Status400BadRequest,
        "A correspondence cannot contain more than 100 attachments in total",
        1038
    );
    public static readonly CorrespondenceError MessageSenderIsNotPlainText = new(
        StatusCodes.Status400BadRequest,
        "Message sender must be plain text",
        1039
    );
    public static readonly CorrespondenceError MessageSummaryWrongLength = new(
        StatusCodes.Status400BadRequest,
        "Message summary, if not null, must be between 0 and 255 characters long",
        1042
    );
    public static readonly CorrespondenceError IdempotencyKeyNotAllowedWithMultipleRecipients = new(
        StatusCodes.Status400BadRequest,
        "Idempotency key is not supported for requests with multiple recipients",
        1047
    );
    public static readonly CorrespondenceError AttachmentNotFound = new(
        StatusCodes.Status404NotFound,
        "The requested attachment was not found",
        2001
    );
    public static readonly CorrespondenceError FilenameMissing = new(
        StatusCodes.Status400BadRequest,
        "Filename is missing",
        2010
    );
    public static readonly CorrespondenceError FilenameTooLong = new(
        StatusCodes.Status400BadRequest,
        "Filename is too long",
        2011
    );
    public static readonly CorrespondenceError FilenameInvalid = new(
        StatusCodes.Status400BadRequest,
        "Filename contains invalid characters. The ruleset is based on Windows file naming convention which is "
            + "defined here: https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#file-and-directory-names",
        2012
    );
    public static readonly CorrespondenceError FiletypeNotAllowed = new(
        StatusCodes.Status400BadRequest,
        "Filetype not allowed",
        2013
    );
    public static readonly CorrespondenceError FilenameCannotBeAReservedWindowsFilename = new(
        StatusCodes.Status400BadRequest,
        "The filename uses a Windows reserved name. Files cannot be named CON, PRN, AUX, NUL, COM1-COM9, or "
            + "LPT1-LPT9 (e.g., 'CON.txt' is not allowed, but 'CONSOLE.txt' is).",
        2021
    );
    public static readonly CorrespondenceError MissingEmailContent = new(
        StatusCodes.Status400BadRequest,
        "Email body and subject must be provided when sending email notifications",
        3002
    );
    public static readonly CorrespondenceError MissingEmailReminderContent = new(
        StatusCodes.Status400BadRequest,
        "Reminder email body and subject must be provided when sending reminder email notifications",
        3003
    );
    public static readonly CorrespondenceError MissingSmsContent = new(
        StatusCodes.Status400BadRequest,
        "SMS body must be provided when sending SMS notifications",
        3004
    );
    public static readonly CorrespondenceError MissingSmsReminderContent = new(
        StatusCodes.Status400BadRequest,
        "Reminder SMS body must be provided when sending reminder SMS notifications",
        3005
    );
    public static readonly CorrespondenceError MissingPreferredChannel = new(
        StatusCodes.Status400BadRequest,
        "Email body, subject and SMS body must be provided when sending preferred notifications",
        3006
    );
    public static readonly CorrespondenceError MissingPreferredReminderChannel = new(
        StatusCodes.Status400BadRequest,
        "Reminder email body, subject and SMS body must be provided when sending reminder preferred notifications",
        3007
    );
    public static readonly CorrespondenceError InvalidEmailProvided = new(
        StatusCodes.Status400BadRequest,
        "Invalid email provided for custom recipient.",
        3011
    );
    public static readonly CorrespondenceError InvalidMobileNumberProvided = new(
        StatusCodes.Status400BadRequest,
        "Invalid mobile number provided. Mobile number can contain only '+' and numeric characters, and it must "
            + "adhere to the E.164 standard.",
        3012
    );
    public static readonly CorrespondenceError CustomRecipientWithNumberOrEmailNotAllowedWithKeyWordRecipientName =
        new(
            StatusCodes.Status400BadRequest,
            "Recipient overrides with email or mobile number are not allowed when using notification recipient name "
                + "because of name lookup",
            3015
        );
    public static readonly CorrespondenceError CustomRecipientWithMultipleRecipientsNotAllowed = new(
        StatusCodes.Status400BadRequest,
        "Custom recipient with multiple recipients is not allowed",
        3017
    );
    public static readonly CorrespondenceError CustomRecipientWithMultipleIdentifiersNotAllowed = new(
        StatusCodes.Status400BadRequest,
        "Custom recipient with multiple identifiers is not allowed",
        3018
    );
    public static readonly CorrespondenceError CustomRecipientWithoutIdentifierNotAllowed = new(
        StatusCodes.Status400BadRequest,
        "Custom recipient without identifier is not allowed",
        3019
    );
    public static readonly CorrespondenceError OverrideRegisteredContactInformationRequiresCustomRecipients = new(
        StatusCodes.Status400BadRequest,
        "OverrideRegisteredContactInformation flag can only be used when CustomRecipients is provided",
        3022
    );
    public static readonly CorrespondenceError MissingEmailAndSmsContent = new(
        StatusCodes.Status400BadRequest,
        "Email body, subject and SMS body must be provided when sending email and SMS notifications",
        3024
    );
    public static readonly CorrespondenceError MissingEmailAndSmsReminderContent = new(
        StatusCodes.Status400BadRequest,
        "Reminder email body, subject and SMS body must be provided when sending reminder email and SMS notifications",
        3025
    );

    public static CorrespondenceError RecipientLookupFailed(IEnumerable<string> recipients) =>
        new(
            StatusCodes.Status400BadRequest,
            $"Could not find partyId for the following recipients: {string.Join(", ", recipients)}",
            1029
        );

    /// <summary>An error the real API reports from its request model validation, which carries no code.</summary>
    public static CorrespondenceError Invalid(string message) => new(StatusCodes.Status400BadRequest, message);
}
