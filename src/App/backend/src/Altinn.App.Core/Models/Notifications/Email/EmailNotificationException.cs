using System.Net;
using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Models.Notifications.Email;

/// <summary>
/// Class representing an exception throw when an email notification could not be sent.
/// </summary>
public sealed class EmailNotificationException : AltinnException
{
    internal EmailNotificationException(
        string? message,
        HttpStatusCode? statusCode,
        string? reasonPhrase,
        string? content,
        Exception? innerException
    )
        : base($"{message}: StatusCode={statusCode}\nReason={reasonPhrase}\nBody={content}\n", innerException) { }
}
