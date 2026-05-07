using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface INotificationService
{
    Task NotifyInternalAsync(
        string org,
        AltinnEnvironment environment,
        INotificationPayload payload,
        CancellationToken cancellationToken
    );

    Task NotifyServiceOwnersAsync(
        string org,
        AltinnEnvironment environment,
        INotificationPayload payload,
        CancellationToken cancellationToken
    );
}
