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
    /// The build of the deploy that runs, or null when the app has not been deployed since the deploy pipeline began
    /// recording it. It matches the deploy's <see cref="Repository.Models.BuildEntity.Id"/> when this Studio
    /// environment deployed it.
    /// </summary>
    public string? BuildId { get; init; }

    public static RunningApp From(AppRunState.Running running) =>
        new()
        {
            Environment = running.Environment,
            Version = running.Version,
            BuildId = running.BuildId,
        };
}
