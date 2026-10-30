namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

public record RunningAppDeployment(
    string Release,
    string? ImageTag,
    string? BuildId,
    string? SourceEnvironment,
    string? DeploymentId
);
