using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAppInactivityUndeployService
{
    Task<IReadOnlyList<InactivityUndeployCandidate>> GetAppsForDecommissioningAsync(
        InactivityUndeployEvaluationOptions options,
        CancellationToken cancellationToken = default
    );
}
