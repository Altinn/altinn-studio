namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

public record AppDeployment(
    string Org,
    string Env,
    string App,
    string SourceEnvironment,
    string BuildId,
    string ImageTag
);
