using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The app's deploys through this Studio environment, and what runs of it in each of the org's environments.
/// </summary>
public sealed class DeploymentsResponse
{
    public required IReadOnlyList<DeploymentEntity> PipelineDeploymentList { get; init; }

    public required IReadOnlyList<AppInEnvironment> EnvironmentList { get; init; }

    /// <summary>
    /// The running apps of <see cref="EnvironmentList"/>, as frontends loaded before it existed read them. Remove once
    /// they have all reloaded.
    /// </summary>
    public IEnumerable<RunningApp> RunningAppList =>
        EnvironmentList.Select(environment => environment.RunningApp).OfType<RunningApp>();
}
