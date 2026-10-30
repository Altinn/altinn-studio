namespace Altinn.Studio.Gateway.Contracts.Deploy;

/// <summary>
/// The app's Kubernetes Deployment as it runs in the cluster, as opposed to the desired state in its
/// <see cref="AppDeployment"/> HelmRelease.
/// </summary>
/// <param name="Release">The Deployment's <c>release</c> label, <c>{org}-{app}</c>.</param>
/// <param name="ImageTag">The tag of the app container's image, or null when the image has none.</param>
public record RunningAppDeployment(string Release, string? ImageTag);
