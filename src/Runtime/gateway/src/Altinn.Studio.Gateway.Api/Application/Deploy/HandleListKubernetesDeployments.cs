using Altinn.Studio.Gateway.Api.Clients.K8s;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleListKubernetesDeployments
{
    private const string DefaultNamespace = "default";

    internal static async Task<IResult> Handler(
        [FromQuery] string? labelSelector,
        DeploymentsClient deploymentsClient,
        CancellationToken cancellationToken
    )
    {
        var deployments = await deploymentsClient.List(
            DefaultNamespace,
            labelSelector: labelSelector,
            cancellationToken: cancellationToken
        );
        return Results.Ok(deployments);
    }
}
