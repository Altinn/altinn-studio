using Altinn.App.Core.Models.Notifications.Email;

namespace Altinn.App.Core.Features;

/// <summary>
/// Client for managing Altinn email notifications
/// </summary>
public interface IEmailNotificationClient
{
    /// <summary>
    /// Orders a new email notification
    /// </summary>
    /// <param name="emailNotification"></param>
    /// <param name="ct"></param>
    /// <returns>The id of the email notification order</returns>
    /// <exception cref="EmailNotificationException"></exception>
    Task<EmailOrderResponse> Order(EmailNotification emailNotification, CancellationToken ct);
}
