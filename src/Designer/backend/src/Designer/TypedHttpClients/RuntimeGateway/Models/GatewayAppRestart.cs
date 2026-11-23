namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

/// <summary>
/// How the runtime gateway answered a restart: <see cref="Started"/>, <see cref="NotFound"/>, <see cref="Updating"/>
/// or <see cref="Paused"/>.
/// </summary>
public abstract record GatewayAppRestart
{
    private GatewayAppRestart() { }

    /// <param name="Deployment">The app as the restart left it, so already updating.</param>
    public sealed record Started(RunningAppDeployment Deployment) : GatewayAppRestart;

    public sealed record NotFound : GatewayAppRestart;

    /// <summary>
    /// A deploy or an earlier restart is still replacing the app's instances.
    /// </summary>
    public sealed record Updating : GatewayAppRestart;

    /// <summary>
    /// Someone paused the app's Deployment in the cluster, so its instances would not be replaced.
    /// </summary>
    public sealed record Paused : GatewayAppRestart;
}
