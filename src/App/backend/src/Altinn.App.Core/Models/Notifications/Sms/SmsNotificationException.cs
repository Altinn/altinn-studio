using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Models.Notifications.Sms;

/// <summary>
/// Class representing an exception thrown when a SMS notificcation order could not be created
/// </summary>
public sealed class SmsNotificationException : AltinnException
{
    internal SmsNotificationException(
        string? message,
        HttpResponseMessage? response,
        string? content,
        Exception? innerException
    )
        : base(
            $"{message}: StatusCode={response?.StatusCode}\nReason={response?.ReasonPhrase}\nBody={content}\n",
            innerException
        ) { }
}
