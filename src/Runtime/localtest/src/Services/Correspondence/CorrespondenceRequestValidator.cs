using System.Text.RegularExpressions;
using Altinn.Correspondence.Controllers;
using Altinn.Notifications.Core.Helpers;
using PhoneNumbers;

namespace LocalTest.Services.Correspondence;

/// <summary>
/// The checks the Correspondence API makes on a request that need nothing but the request itself, with the same
/// errors. A check the real API makes against data Localtest does not have, such as the resource registry, access
/// to the resource or the contact reservation register, is not made here. Where the real check cannot be repeated
/// exactly, this one is more lenient, so Localtest never rejects what a deployed environment accepts.
/// </summary>
internal static partial class CorrespondenceRequestValidator
{
    private const int MaxRecipients = 500;
    private const int MaxAttachments = 100;
    private const int MaxTitleLength = 255;
    private const int MaxSummaryLength = 255;
    private const int MaxBodyLength = 30000;
    private const int MaxFileNameLength = 255;
    private const string RecipientNameKeyword = "$recipientName$";

    private static readonly string[] _languages = ["nb", "nn", "en"];

    private static readonly string[] _allowedFileTypes =
    [
        ".doc",
        ".xls",
        ".docx",
        ".xlsx",
        ".ppt",
        ".pps",
        ".zip",
        ".pdf",
        ".html",
        ".txt",
        ".xml",
        ".jpg",
        ".jpeg",
        ".gif",
        ".bmp",
        ".png",
        ".json",
        ".csv",
        ".dcm",
        ".dicom",
    ];

    /// <summary>
    /// The reason the Correspondence API would refuse the request before it looks up the idempotent key, or
    /// <c>null</c> when it would not: what its model validation refuses, and a key sent to several recipients.
    /// </summary>
    public static CorrespondenceError? ValidateBeforeIdempotencyCheck(InitializeCorrespondencesRequestDto request)
    {
        if (ValidateRecipients(request.Recipients) is { } recipientError)
            return recipientError;
        if (request.IdempotentKey == Guid.Empty)
            return CorrespondenceErrors.InvalidIdempotencyKey;

        if (request.Correspondence is not { } correspondence)
            return CorrespondenceErrors.Invalid("The Correspondence field is required.");
        if (string.IsNullOrWhiteSpace(correspondence.ResourceId))
            return CorrespondenceErrors.Invalid("The ResourceId field is required.");
        if (string.IsNullOrWhiteSpace(correspondence.SendersReference))
            return CorrespondenceErrors.Invalid("The SendersReference field is required.");
        if (ValidateContentFields(correspondence.Content) is { } contentError)
            return contentError;

        if (request.IdempotentKey is not null && request.Recipients!.Count > 1)
            return CorrespondenceErrors.IdempotencyKeyNotAllowedWithMultipleRecipients;
        return null;
    }

    /// <summary>
    /// The reason the Correspondence API would refuse a request that passed
    /// <see cref="ValidateBeforeIdempotencyCheck"/> and whose idempotent key is unused, or <c>null</c> when it would
    /// not.
    /// </summary>
    public static CorrespondenceError? Validate(InitializeCorrespondencesRequestDto request, DateTimeOffset now)
    {
        IReadOnlyList<string> recipients = request.Recipients!;
        CorrespondenceRequestDto correspondence = request.Correspondence!;

        if (recipients.Distinct(StringComparer.OrdinalIgnoreCase).Count() != recipients.Count)
            return CorrespondenceErrors.DuplicateRecipients;

        if (correspondence.IsConfirmationNeeded && correspondence.DueDateTime is null)
            return CorrespondenceErrors.DueDateRequired;
        if (correspondence.DueDateTime is { } dueDate)
        {
            if (dueDate < now)
                return CorrespondenceErrors.DueDatePriorToday;
            if (dueDate < (correspondence.RequestedPublishTime ?? now))
                return CorrespondenceErrors.DueDatePriorRequestedPublishTime;
        }

        if (ValidateContent(correspondence.Content!) is { } contentError)
            return contentError;
        if (!string.IsNullOrEmpty(correspondence.MessageSender) && !IsPlainText(correspondence.MessageSender))
            return CorrespondenceErrors.MessageSenderIsNotPlainText;

        if (request.ExistingAttachments is { Count: > MaxAttachments })
            return CorrespondenceErrors.AttachmentCountExceeded;

        if (correspondence.Notification is { } notification)
        {
            return ValidateCustomRecipients(notification, recipients.Count) ?? ValidateNotificationContent(notification);
        }

        return null;
    }

    /// <summary>The reason the Correspondence API would refuse to initialize the attachment, if any.</summary>
    public static CorrespondenceError? ValidateAttachment(InitializeAttachmentRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ResourceId))
            return CorrespondenceErrors.Invalid("The ResourceId field is required.");
        if (string.IsNullOrWhiteSpace(request.SendersReference))
            return CorrespondenceErrors.Invalid("The SendersReference field is required.");

        string? fileName = request.FileName;
        if (string.IsNullOrWhiteSpace(fileName))
            return CorrespondenceErrors.FilenameMissing;
        if (fileName.Length > MaxFileNameLength)
            return CorrespondenceErrors.FilenameTooLong;
        if (!_allowedFileTypes.Contains(Path.GetExtension(fileName).ToLowerInvariant()))
            return CorrespondenceErrors.FiletypeNotAllowed;
        if (InvalidFileNameCharacters().IsMatch(fileName))
            return CorrespondenceErrors.FilenameInvalid;
        if (WindowsReservedFileName().IsMatch(fileName))
            return CorrespondenceErrors.FilenameCannotBeAReservedWindowsFilename;

        return null;
    }

    private static CorrespondenceError? ValidateRecipients(IReadOnlyList<string>? recipients)
    {
        if (recipients is not { Count: > 0 })
            return CorrespondenceErrors.Invalid("Recipients can not be empty");
        if (recipients.Count > MaxRecipients)
            return CorrespondenceErrors.Invalid("Recipients can contain at most 500 recipients");
        if (recipients.Any(string.IsNullOrWhiteSpace))
            return CorrespondenceErrors.Invalid("Recipients can not contain null or empty values");
        if (recipients.Any(recipient => CorrespondenceRecipient.TryParse(recipient) is null))
            return CorrespondenceErrors.Invalid(CorrespondenceRecipient.InvalidFormatMessage);
        return null;
    }

    /// <summary>The content fields the real API's model validation requires, and their lengths.</summary>
    private static CorrespondenceError? ValidateContentFields(CorrespondenceContentRequestDto? content)
    {
        if (content is null)
            return CorrespondenceErrors.MissingContent;
        if (string.IsNullOrWhiteSpace(content.MessageTitle))
            return CorrespondenceErrors.MessageTitleEmpty;
        if (content.MessageTitle.Length > MaxTitleLength)
            return CorrespondenceErrors.MessageTitleTooLong;
        if (content.MessageSummary is { Length: > MaxSummaryLength })
            return CorrespondenceErrors.MessageSummaryWrongLength;
        if (string.IsNullOrEmpty(content.MessageBody))
            return CorrespondenceErrors.MessageBodyEmpty;
        if (content.MessageBody.Length > MaxBodyLength)
            return CorrespondenceErrors.MessageBodyTooLong;
        return null;
    }

    private static CorrespondenceError? ValidateContent(CorrespondenceContentRequestDto content)
    {
        if (!IsPlainText(content.MessageTitle!))
            return CorrespondenceErrors.MessageTitleIsNotPlainText;
        if (!_languages.Contains(LanguageOrDefault(content.Language).ToLowerInvariant()))
            return CorrespondenceErrors.InvalidLanguage;
        return null;
    }

    /// <summary>The content's language, or <c>nb</c>, which the real API takes when the request names none.</summary>
    public static string LanguageOrDefault(string? language) =>
        string.IsNullOrWhiteSpace(language) ? "nb" : language;

    private static CorrespondenceError? ValidateCustomRecipients(NotificationRequestDto notification, int recipientCount)
    {
        if (notification.CustomRecipients is not { Count: > 0 } customRecipients)
        {
            return notification.OverrideRegisteredContactInformation
                ? CorrespondenceErrors.OverrideRegisteredContactInformationRequiresCustomRecipients
                : null;
        }
        if (recipientCount > 1)
            return CorrespondenceErrors.CustomRecipientWithMultipleRecipientsNotAllowed;

        foreach (NotificationRecipientDto customRecipient in customRecipients)
        {
            int identifiers = new[]
            {
                customRecipient.OrganizationNumber,
                customRecipient.NationalIdentityNumber,
                customRecipient.EmailAddress,
                customRecipient.MobileNumber,
            }.Count(identifier => !string.IsNullOrEmpty(identifier));
            if (identifiers == 0)
                return CorrespondenceErrors.CustomRecipientWithoutIdentifierNotAllowed;
            if (identifiers > 1)
                return CorrespondenceErrors.CustomRecipientWithMultipleIdentifiersNotAllowed;

            if (
                (customRecipient.EmailAddress is not null || customRecipient.MobileNumber is not null)
                && UsesRecipientName(notification)
            )
                return CorrespondenceErrors.CustomRecipientWithNumberOrEmailNotAllowedWithKeyWordRecipientName;
            if (
                customRecipient.EmailAddress is { } email
                && (!EmailAddress().IsMatch(email) || email.Contains(';', StringComparison.Ordinal))
            )
                return CorrespondenceErrors.InvalidEmailProvided;
            if (customRecipient.MobileNumber is { } mobile && !IsValidMobileNumber(mobile))
                return CorrespondenceErrors.InvalidMobileNumberProvided;
        }

        return null;
    }

    /// <summary>
    /// A custom template must carry the texts for the channel it is sent on, and for the reminder's channel when
    /// it sends a reminder. A generic template brings its own.
    /// </summary>
    private static CorrespondenceError? ValidateNotificationContent(NotificationRequestDto notification)
    {
        if (notification.NotificationTemplate != NotificationTemplate.CustomMessage)
            return null;

        NotificationChannel? channel = notification.NotificationChannel;
        NotificationChannel? reminderChannel = notification.ReminderNotificationChannel ?? channel;
        bool reminder = notification.SendReminder;
        bool email = Has(notification.EmailBody) && Has(notification.EmailSubject);
        bool sms = Has(notification.SmsBody);
        bool reminderEmail = Has(notification.ReminderEmailBody) && Has(notification.ReminderEmailSubject);
        bool reminderSms = Has(notification.ReminderSmsBody);

        if (channel == NotificationChannel.Email && !email)
            return CorrespondenceErrors.MissingEmailContent;
        if (reminder && reminderChannel == NotificationChannel.Email && !reminderEmail)
            return CorrespondenceErrors.MissingEmailReminderContent;
        if (channel == NotificationChannel.Sms && !sms)
            return CorrespondenceErrors.MissingSmsContent;
        if (reminder && reminderChannel == NotificationChannel.Sms && !reminderSms)
            return CorrespondenceErrors.MissingSmsReminderContent;
        if ((channel is NotificationChannel.EmailPreferred or NotificationChannel.SmsPreferred) && !(email && sms))
            return CorrespondenceErrors.MissingPreferredChannel;
        if (
            reminder
            && (reminderChannel is NotificationChannel.EmailPreferred or NotificationChannel.SmsPreferred)
            && !(reminderEmail && reminderSms)
        )
            return CorrespondenceErrors.MissingPreferredReminderChannel;
        if (channel == NotificationChannel.EmailAndSms && !(email && sms))
            return CorrespondenceErrors.MissingEmailAndSmsContent;
        if (reminder && reminderChannel == NotificationChannel.EmailAndSms && !(reminderEmail && reminderSms))
            return CorrespondenceErrors.MissingEmailAndSmsReminderContent;

        return null;
    }

    private static bool Has(string? text) => !string.IsNullOrEmpty(text);

    private static bool UsesRecipientName(NotificationRequestDto notification) =>
        new[]
        {
            notification.EmailSubject,
            notification.EmailBody,
            notification.SmsBody,
            notification.ReminderEmailSubject,
            notification.ReminderEmailBody,
            notification.ReminderSmsBody,
        }.Any(text => text?.Contains(RecipientNameKeyword, StringComparison.Ordinal) == true);

    /// <summary>
    /// The real API renders the text as markdown and requires it to come out unchanged. This catches what it
    /// rejects most often, HTML tags, links, headings and emphasis, but lets through some text the real check
    /// refuses. Like the real check, it ignores backticks and backslashes.
    /// </summary>
    private static bool IsPlainText(string text) =>
        !Markup().IsMatch(text.Replace("`", "", StringComparison.Ordinal).Replace("\\", "", StringComparison.Ordinal));

    [GeneratedRegex(
        @"<[A-Za-z!/][^>]*>"
            + @"|!?\[[^\]]*\]\([^)]*\)"
            + @"|^\s{0,3}#{1,6}(?:\s|$)"
            + @"|(\*\*|__)(?=\S).+?(?<=\S)\1"
            + @"|\*(?=\S)[^*]+?(?<=\S)\*"
            + @"|(?<![\w_])_(?=\S)[^_]+?(?<=\S)_(?![\w_])",
        RegexOptions.Multiline
    )]
    private static partial Regex Markup();

    // The Correspondence API's own pattern for a custom recipient's email address.
    [GeneratedRegex(
        @"^((""[^""]+"")|(([a-zA-Z0-9æøåÆØÅ!#$%&'*+\-=?\^_`{|}~])+(\.([a-zA-Z0-9æøåÆØÅ!#$%&'*+\-=?\^_`{|}~])+)*))@((((([a-zA-Z0-9æøåÆØÅ]([a-zA-Z0-9\-æøåÆØÅ]{0,61})[a-zA-Z0-9æøåÆØÅ]\.)|[a-zA-Z0-9æøåÆØÅ]\.){1,9})([a-zA-Z]{2,14}))|((\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})))$"
    )]
    private static partial Regex EmailAddress();

    /// <summary>
    /// The real API's check: a country code, as <c>+</c> or <c>00</c>, and a number libphonenumber accepts, so a bare
    /// Norwegian number such as <c>92010000</c> is refused. A number it cannot parse is invalid rather than an error.
    /// </summary>
    private static bool IsValidMobileNumber(string mobileNumber)
    {
        try
        {
            return MobileNumberHelper.IsValidMobileNumber(mobileNumber);
        }
        catch (NumberParseException)
        {
            return false;
        }
    }

    [GeneratedRegex(@"[<>:""/\\|?*\u0000-\u001F]")]
    private static partial Regex InvalidFileNameCharacters();

    [GeneratedRegex(@"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)", RegexOptions.IgnoreCase)]
    private static partial Regex WindowsReservedFileName();
}
