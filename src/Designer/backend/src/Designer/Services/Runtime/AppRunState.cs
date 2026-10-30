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
    /// <param name="DeployedBy">The Studio environment whose deploy runs.</param>
    public sealed record Running(string Environment, string? Version, StudioDeploy DeployedBy)
        : AppRunState(Environment);

    public sealed record NotRunning(string Environment) : AppRunState(Environment);

    /// <summary>
    /// The environment could not tell, such as when its runtime cluster is unreachable.
    /// </summary>
    public sealed record Unavailable(string Environment) : AppRunState(Environment);
}

/// <summary>
/// Which Studio environment's deploy runs. Several Studio environments share a runtime cluster, and only a deploy
/// from this one is in its deploy history.
/// </summary>
public abstract record StudioDeploy
{
    private StudioDeploy() { }

    /// <param name="BuildId">The deploy's build, which matches its <see cref="Repository.Models.BuildEntity.Id"/>.</param>
    public sealed record ThisStudio(string BuildId) : StudioDeploy;

    public sealed record AnotherStudio : StudioDeploy;

    /// <summary>
    /// The app has not been deployed since the deploy pipeline began recording which Studio environment deployed it.
    /// </summary>
    public sealed record Unknown : StudioDeploy;
}
