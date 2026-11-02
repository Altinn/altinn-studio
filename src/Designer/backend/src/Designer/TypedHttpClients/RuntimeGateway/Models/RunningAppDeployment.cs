namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

/// <summary>
/// What the runtime gateway reports runs of an app, with only the fields Designer reads.
/// </summary>
public sealed record RunningAppDeployment(string? ImageTag, string? BuildId);
