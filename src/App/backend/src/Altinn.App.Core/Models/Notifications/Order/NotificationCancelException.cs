using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Models.Notifications.Order;

/// <summary>
/// Exception thrown when a notification order could not be cancelled.
/// </summary>
public sealed class NotificationCancelException : AltinnException
{
    internal NotificationCancelException(
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
