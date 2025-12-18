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
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        if (request.IsNewApp || request.IsUndeploy)
        {
            var syncRootName = GetSyncRootName(originEnvironment);
            await ociRepositoryClient.TriggerReconcileAsync(syncRootName, DefaultNamespace, cancellationToken);

            logger.LogInformation(
                "Triggered reconciliation for syncroot {SyncRoot} (originEnv: {OriginEnv})",
                syncRootName,
                originEnvironment
            );
        }
        else
        {
            await ociRepositoryClient.TriggerReconcileAsync(app, DefaultNamespace, cancellationToken);

            logger.LogInformation(
                "Triggered reconciliation for app {App} (originEnv: {OriginEnv})",
                app,
                originEnvironment
            );
        }

        return Results.Ok();
    }

    private static string GetSyncRootName(string originEnvironment) =>
        originEnvironment switch
        {
            "dev" => "apps-syncroot-repo-dev",
            "staging" => "apps-syncroot-repo-staging",
            _ => "apps-syncroot-repo",
        };
}
