#nullable disable
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Repository.Models;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Deployments response
/// </summary>
public class DeploymentsResponse
{
    public List<DeploymentEntity> PipelineDeploymentList { get; set; }

    public List<RunningApp> RunningAppList { get; set; }

    /// <summary>
    /// <see cref="RunningAppList"/> as frontends loaded before it existed read it. Remove once they have all reloaded.
    /// </summary>
    [JsonProperty("kubernetesDeploymentList")]
    public IEnumerable<object> RunningAppListForOlderFrontends =>
        RunningAppList?.Select(app => new { envName = app.Environment, version = app.Version });
}
