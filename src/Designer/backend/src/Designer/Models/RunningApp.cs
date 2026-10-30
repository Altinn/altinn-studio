namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The app as it runs in an environment.
/// </summary>
public class RunningApp
{
    public required string EnvName { get; init; }

    /// <summary>
    /// The deployed tag, or null when the runtime gateway could not tell it.
    /// </summary>
    public string? Version { get; init; }

    /// <summary>
    /// The build of this Studio environment's deploy that runs, which matches its <see cref="Repository.Models.BuildEntity.Id"/>.
    /// Null when another Studio environment deployed the app, or when the app has not been deployed since the deploy
    /// pipeline began recording it.
    /// </summary>
    public string? BuildId { get; init; }
}
