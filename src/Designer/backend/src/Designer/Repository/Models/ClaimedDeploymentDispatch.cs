#nullable enable
namespace Altinn.Studio.Designer.Repository.Models;

public sealed record ClaimedDeploymentDispatch
{
    public required DeploymentEntity Deployment { get; init; }

    public required string ProtectedAppDeployToken { get; init; }
}
