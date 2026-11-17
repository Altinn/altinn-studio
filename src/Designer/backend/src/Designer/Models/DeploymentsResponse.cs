using System.Collections.Generic;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The app's deploys through this Studio environment, and what runs of it in each of the org's environments.
/// </summary>
public sealed class DeploymentsResponse
{
    public required IReadOnlyList<DeploymentEntity> PipelineDeploymentList { get; init; }

    public required IReadOnlyList<AppInEnvironment> EnvironmentList { get; init; }
}
