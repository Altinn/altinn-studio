using Altinn.Studio.Designer.Services.Runtime;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The app as it runs in an environment.
/// </summary>
public sealed class RunningApp
{
    public required string Environment { get; init; }

    /// <summary>
    /// The deployed tag, or null when the runtime gateway could not tell it.
    /// </summary>
    public string? Version { get; init; }

    /// <summary>
    /// Whether this Studio environment deployed what runs. Null when the app has not been deployed since the deploy
    /// pipeline began recording it.
    /// </summary>
    public bool? DeployedFromThisStudio { get; init; }

    /// <summary>
    /// The build of this Studio environment's deploy that runs, which matches its <see cref="Repository.Models.BuildEntity.Id"/>.
    /// Set only when <see cref="DeployedFromThisStudio"/> is true.
    /// </summary>
    public string? BuildId { get; init; }

    public static RunningApp From(AppRunState.Running running) =>
        new()
        {
            Environment = running.Environment,
            Version = running.Version,
            DeployedFromThisStudio = running.DeployedBy switch
            {
                StudioDeploy.ThisStudio => true,
                StudioDeploy.AnotherStudio => false,
                _ => null,
            },
            BuildId = (running.DeployedBy as StudioDeploy.ThisStudio)?.BuildId,
        };
}
