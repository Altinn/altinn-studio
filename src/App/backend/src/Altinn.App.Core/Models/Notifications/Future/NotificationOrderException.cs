using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Models.Notifications.Future;

/// <summary>
/// Exception thrown when a notification order could not be created.
/// </summary>
public sealed class NotificationOrderException : AltinnException
{
    internal NotificationOrderException(
        string? message,
        HttpResponseMessage? response,
        string? content,
        Exception? innerException
    )
        : base(
            $"{message}: StatusCode={(int?)response?.StatusCode} Reason={response?.ReasonPhrase} BodyLength={content?.Length ?? 0}",
            innerException
        ) { }
}
