using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;
using Altinn.Studio.Designer.TypedHttpClients.Slack;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface INotificationPayload
{
    string UniqueId { get; }
    string NotificationName { get; }
    string GetEmailSubject();
    string GetEmailBody();
    EmailContentType EmailContentType { get; }
    string GetSmsBody();
    SlackMessage GetSlackMessage();
}
