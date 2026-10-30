namespace Altinn.Studio.Designer.Services.Runtime;

/// <summary>
/// What runs of an app in one environment.
/// </summary>
public abstract record AppRunState(string Environment)
{
    /// <param name="Environment">The environment.</param>
    /// <param name="Version">The deployed tag, or null when the runtime could not tell it.</param>
    /// <param name="OwnBuildId">
    /// The build of the deploy that runs, when this Studio environment deployed it. It matches the deploy's
    /// <see cref="Repository.Models.BuildEntity.Id"/>. Null for another Studio environment's deploy, and for an app
    /// not deployed since the deploy pipeline began recording it.
    /// </param>
    public sealed record Running(string Environment, string? Version, string? OwnBuildId) : AppRunState(Environment);

    public sealed record NotRunning(string Environment) : AppRunState(Environment);

    /// <summary>
    /// The environment could not tell, such as when its runtime cluster is unreachable.
    /// </summary>
    public sealed record Unavailable(string Environment) : AppRunState(Environment);
}
