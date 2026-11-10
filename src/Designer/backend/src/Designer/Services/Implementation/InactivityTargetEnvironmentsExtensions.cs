using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public static class InactivityTargetEnvironmentsExtensions
{
    /// <summary>
    /// Resolves the environments of an org that inactivity undeploy and activity tracking cover.
    /// </summary>
    public static async Task<IReadOnlyList<string>> GetInactivityTargetEnvironmentsForOrg(
        this IEnvironmentsService environmentsService,
        string org,
        string? environmentFilter,
        CancellationToken cancellationToken
    )
    {
        if (!string.IsNullOrWhiteSpace(environmentFilter))
        {
            return AppInactivityUndeployJobConstants.IsTargetEnvironment(environmentFilter) ? [environmentFilter] : [];
        }

        var environments = await environmentsService.GetOrganizationEnvironments(org, cancellationToken);
        return environments.Select(e => e.Name).Where(AppInactivityUndeployJobConstants.IsTargetEnvironment).ToArray();
    }
}
