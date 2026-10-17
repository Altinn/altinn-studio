using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IOrgSettingsService
{
    /// <summary>
    /// Gets the org's effective inactivity undeploy settings, which are the system default when the org has none.
    /// </summary>
    Task<InactivityUndeploySettings> GetInactivityUndeploySettingsAsync(
        string org,
        CancellationToken cancellationToken = default
    );

    Task UpsertInactivityUndeploySettingsAsync(
        AltinnOrgEditingContext editingContext,
        InactivityUndeploySettings settings,
        CancellationToken cancellationToken = default
    );
}
