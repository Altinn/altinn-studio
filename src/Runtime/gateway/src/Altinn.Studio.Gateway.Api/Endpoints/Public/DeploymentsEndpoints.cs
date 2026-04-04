using Altinn.Studio.Gateway.Api.Application;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal static class DeploymentsEndpoints
{
    public static RouteGroupBuilder MapDeploymentsEndpoints(this RouteGroupBuilder publicApiV1)
    {
        var deploymentsApi = publicApiV1
            .MapGroup("/deployments")
            .RequireAuthorization("MaskinportenScope")
            .WithTags("Deployments");

        deploymentsApi
            .MapGet(string.Empty, HandleListKubernetesDeployments.Handler)
            .WithName("ListKubernetesDeployments")
            .WithSummary("List Kubernetes deployments.")
            .WithDescription("Compatibility endpoint for Kubernetes wrapper deployments API.");

        return publicApiV1;
    }
}
