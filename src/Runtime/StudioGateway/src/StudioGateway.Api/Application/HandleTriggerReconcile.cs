using System.Net;
using Microsoft.AspNetCore.Mvc;
using StudioGateway.Api.Clients.K8s;
using StudioGateway.Contracts.Deploy;

namespace StudioGateway.Api.Application;

internal static class HandleTriggerReconcile
{
    private const string DefaultNamespace = "default";

    internal static async Task<IResult> Handler(
        string app,
        string originEnvironment,
        [FromBody] TriggerReconcileRequest request,
        OciRepositoryClient ociRepositoryClient,
        KustomizationClient kustomizationClient,
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        if (!request.IsUndeploy)
        {
            try
            {
                await ociRepositoryClient.TriggerReconcileAsync(app, DefaultNamespace, cancellationToken);
                await kustomizationClient.TriggerReconcileAsync(app, DefaultNamespace, cancellationToken);

                logger.LogInformation(
                    "Triggered reconciliation for app {App} (originEnv: {OriginEnv})",
                    app,
                    originEnvironment
                );

                return Results.Ok();
            }
            catch (k8s.Autorest.HttpOperationException ex) when (ex.Response.StatusCode == HttpStatusCode.NotFound)
            {
#pragma warning disable S6667
                logger.LogInformation(
                    "Attempted to trigger reconciliation for app {App} (originEnv: {OriginEnv}), but resources were not found. This app is probably new.",
                    app,
                    originEnvironment
                );
#pragma warning restore S6667
            }
        }

        var (ociRepoName, kustomizationName) = GetSyncRootNames(originEnvironment);

        await ociRepositoryClient.TriggerReconcileAsync(ociRepoName, DefaultNamespace, cancellationToken);
        await kustomizationClient.TriggerReconcileAsync(kustomizationName, DefaultNamespace, cancellationToken);

        logger.LogInformation(
            "Triggered reconciliation for syncroot {OciRepo}/{Kustomization} (originEnv: {OriginEnv})",
            ociRepoName,
            kustomizationName,
            originEnvironment
        );

        return Results.Ok();
    }

    private static (string OciRepoName, string KustomizationName) GetSyncRootNames(string originEnvironment) =>
        originEnvironment switch
        {
            "dev" => ("apps-syncroot-repo-dev", "syncroot-apps-kustomization-dev"),
            "staging" => ("apps-syncroot-repo-staging", "syncroot-apps-kustomization-staging"),
            _ => ("apps-syncroot-repo", "syncroot-apps-kustomization"),
        };
}
