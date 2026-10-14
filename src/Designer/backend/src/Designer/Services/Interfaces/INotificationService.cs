using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface INotificationService
{
    Task NotifyInternalAsync(
        string org,
        AltinnEnvironment environment,
        NotificationPayload payload,
        CancellationToken cancellationToken
    );

    Task NotifyServiceOwnersAsync(
        string org,
        AltinnEnvironment environment,
        NotificationPayload payload,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Sends the report to every active contact point subscribed to the frequency. Unlike the other methods,
    /// failures are not swallowed, because the report is the purpose of the call.
    /// </summary>
    /// <exception cref="Exceptions.Notifications.NotificationDeliveryException">
    /// Thrown after every delivery has been attempted when at least one of them failed.
    /// </exception>
    Task NotifyReportContactPointsAsync(
        string org,
        AltinnEnvironment environment,
        ReportFrequency frequency,
        NotificationPayload payload,
        CancellationToken cancellationToken
    );
}
