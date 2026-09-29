using System.Net;
using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Models.Notifications.Sms;

/// <summary>
/// Class representing an exception thrown when a SMS notificcation order could not be created
/// </summary>
public sealed class SmsNotificationException : AltinnException
{
    internal SmsNotificationException(
        string? message,
        HttpStatusCode? statusCode,
        string? reasonPhrase,
        string? content,
        Exception? innerException
    )
        : base($"{message}: StatusCode={statusCode}\nReason={reasonPhrase}\nBody={content}\n", innerException) { }
}
