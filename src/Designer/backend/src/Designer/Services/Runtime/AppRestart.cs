namespace Altinn.Studio.Designer.Services.Runtime;

/// <summary>
/// The outcome of restarting an app in an environment: <see cref="Started"/>, <see cref="NotRunning"/>,
/// <see cref="Updating"/>, <see cref="Paused"/> or <see cref="DeployedElsewhere"/>.
/// </summary>
public abstract record AppRestart
{
    private AppRestart() { }

    /// <param name="Running">The app as the restart left it, so already updating.</param>
    public sealed record Started(AppRunState.Running Running) : AppRestart;

    public sealed record NotRunning : AppRestart;

    /// <summary>
    /// A deploy or an earlier restart is still replacing the app's instances.
    /// </summary>
    public sealed record Updating : AppRestart;

    /// <summary>
    /// Someone paused the app in the cluster, so its instances would not be replaced.
    /// </summary>
    public sealed record Paused : AppRestart;

    /// <summary>
    /// Another Studio environment deployed the app. Every Studio environment installs an app under the same name, so
    /// restarting it from here would interrupt a deploy this Studio environment does not own.
    /// </summary>
    public sealed record DeployedElsewhere : AppRestart;
}
