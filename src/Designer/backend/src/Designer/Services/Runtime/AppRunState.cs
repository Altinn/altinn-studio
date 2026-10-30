namespace Altinn.Studio.Designer.Services.Runtime;

/// <summary>
/// What runs of an app in one environment: <see cref="Running"/>, <see cref="NotRunning"/> or
/// <see cref="Unavailable"/>, and nothing else.
/// </summary>
public abstract record AppRunState
{
    private AppRunState(string environment) => Environment = environment;

    public string Environment { get; }

    /// <param name="Environment">The environment.</param>
    /// <param name="Version">The deployed tag, or null when the runtime could not tell it.</param>
    /// <param name="BuildId">
    /// The build of the deploy that runs, or null when the app has not been deployed since the deploy pipeline began
    /// recording it. It matches the deploy's <see cref="Repository.Models.BuildEntity.Id"/> when this Studio
    /// environment deployed it.
    /// </param>
    public sealed record Running(string Environment, string? Version, string? BuildId) : AppRunState(Environment);

    public sealed record NotRunning(string Environment) : AppRunState(Environment);

    /// <summary>
    /// The environment could not tell, such as when its runtime cluster is unreachable.
    /// </summary>
    public sealed record Unavailable(string Environment) : AppRunState(Environment);
}
