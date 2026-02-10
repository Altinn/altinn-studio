using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnNotification;

public interface IAltinnNotificationClient
{
    Task SendEmailNotification(
        string idempotencyId,
        string emailAddress,
        string subject,
        string body,
        EmailContentType contentType = EmailContentType.Plain,
        SendingTime sendingTimePolicy = SendingTime.Anytime
    );

    Task SendSmsNotification(
        string idempotencyId,
        string phoneNumber,
        string body,
        SendingTime sendingTimePolicy = SendingTime.Anytime
    );
}
