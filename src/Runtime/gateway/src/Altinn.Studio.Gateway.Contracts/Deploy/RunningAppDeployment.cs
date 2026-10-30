namespace Altinn.Studio.Gateway.Contracts.Deploy;

/// <summary>
/// The app's Kubernetes Deployment as it runs in the cluster, as opposed to the desired state in its
/// <see cref="AppDeployment"/> HelmRelease. Apps not deployed since the deploy pipeline began annotating
/// Deployments have no <paramref name="BuildId"/>, <paramref name="SourceEnvironment"/> or
/// <paramref name="DeploymentId"/>.
/// </summary>
/// <param name="Release">The Deployment's <c>release</c> label, <c>{org}-{app}</c>.</param>
/// <param name="ImageTag">The tag of the app container's image, or null when the image has none.</param>
/// <param name="BuildId">The deploy pipeline's build.</param>
/// <param name="SourceEnvironment">The Studio environment that deployed the app, such as <c>prod</c>.</param>
/// <param name="DeploymentId">The deployment's id in that Studio environment.</param>
public record RunningAppDeployment(
    string Release,
    string? ImageTag,
    string? BuildId,
    string? SourceEnvironment,
    string? DeploymentId
);
