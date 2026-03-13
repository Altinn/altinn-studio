namespace Altinn.Studio.Gateway.Contracts.Deploy;

public record KubernetesDeployment(string? Release, string? Version);
