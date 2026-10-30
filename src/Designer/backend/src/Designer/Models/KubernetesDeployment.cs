#nullable disable
namespace Altinn.Studio.Designer.Models;

public class KubernetesDeployment
{
    public string Release { get; set; }

    public string Version { get; set; }

    public string EnvName { get; set; }

    /// <summary>
    /// The build of this Studio environment's deploy that runs, which matches its <see cref="Repository.Models.BuildEntity.Id"/>.
    /// Null when another Studio environment deployed the app, or when the app has not been deployed since the deploy
    /// pipeline began recording it.
    /// </summary>
    public string BuildId { get; set; }
}
