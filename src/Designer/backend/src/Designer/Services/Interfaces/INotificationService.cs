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

    Task NotifyReportContactPointsAsync(
        string org,
        AltinnEnvironment environment,
        ReportFrequency frequency,
        NotificationPayload payload,
        byte[]? pdfBytes,
        CancellationToken cancellationToken
    );
}
