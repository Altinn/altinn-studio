using System.Net;
using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Models.Notifications.Order;

/// <summary>
/// Exception thrown when a notification order could not be cancelled.
/// </summary>
public sealed class NotificationCancelException : AltinnException
{
    internal NotificationCancelException(
        string? message,
        HttpStatusCode? statusCode,
        string? reasonPhrase,
        string? content,
        Exception? innerException
    )
        : base($"{message}: StatusCode={statusCode}\nReason={reasonPhrase}\nBody={content}\n", innerException) { }
}
