namespace Altinn.Studio.Gateway.Contracts.Deploy;

public record AppDeployment(
    string Org,
    string Env,
    string App,
    string SourceEnvironment,
    string BuildId,
    string ImageTag
);
