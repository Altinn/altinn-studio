using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAdminAuditLogger
{
    Task LogInstanceDeletedAsync(
        string org,
        string env,
        string app,
        string instanceId,
        CancellationToken cancellationToken = default
    );
}
