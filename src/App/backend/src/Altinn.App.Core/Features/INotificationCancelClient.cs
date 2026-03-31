namespace Altinn.App.Core.Features;

/// <summary>
/// Client for managing cancellation of notifications ordered through the app.
/// This is used to cancel notifications that have been ordered but not yet sent,
/// for example when a process is ended before the notification has been sent.
/// </summary>
public interface INotificationCancelClient
{
    /// <summary>
    /// Cancels a previously ordered notification.
    /// </summary>
    /// <param name="notificationOrderId">The order ID of the notification to cancel.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task Cancel(Guid notificationOrderId, CancellationToken ct);
}
