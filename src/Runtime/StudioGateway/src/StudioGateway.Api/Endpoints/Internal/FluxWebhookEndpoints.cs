using Altinn.Studio.Runtime.Common;
using StudioGateway.Api.Clients.Designer.Contracts;
using StudioGateway.Api.Clients.K8s;
using StudioGateway.Api.Endpoints.Internal.Contracts;

namespace StudioGateway.Api.Endpoints.Internal;

internal static class FluxWebhookEndpoints
{
    private sealed record HelmReleaseInfo(string Org, string App, string SourceEnvironment, string? BuildId);

    public static WebApplication MapFluxWebhookEndpoint(this WebApplication app)
    {
        app.MapPost("/api/v1/flux/webhook", HandleFluxWebhook)
            .RequireInternalPort()
            .WithName("FluxWebhook")
            .WithSummary("Receive Flux CD webhook notifications")
            .WithDescription("Endpoint for receiving event notifications from Flux CD controllers")
            .WithTags("Flux");

        return app;
    }

    private static async Task<IResult> HandleFluxWebhook(
        FluxEvent fluxEvent,
        HelmReleaseClient helmReleaseClient,
        IHttpClientFactory httpClientFactory,
        IHostEnvironment hostEnvironment,
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        logger.LogInformation(
            "Received Flux event: {Reason} for {Kind}/{Name} in {Namespace}",
            fluxEvent.Reason,
            fluxEvent.InvolvedObject.Kind,
            fluxEvent.InvolvedObject.Name,
            fluxEvent.InvolvedObject.Namespace
        );

        if (fluxEvent.InvolvedObject.Kind != "HelmRelease")
        {
            logger.LogDebug("Ignoring non-HelmRelease event");
            return Results.Ok();
        }

        if (!IsRelevantEventReason(fluxEvent.Reason))
        {
            logger.LogDebug(
                "Ignoring event with reason {Reason}, only processing install/upgrade/uninstall events",
                fluxEvent.Reason
            );
            return Results.Ok();
        }

        var helmReleaseName = fluxEvent.InvolvedObject.Name;
        var helmReleaseNamespace = fluxEvent.InvolvedObject.Namespace;

        if (string.IsNullOrEmpty(helmReleaseName) || string.IsNullOrEmpty(helmReleaseNamespace))
        {
            logger.LogWarning("HelmRelease name or namespace is missing");
            return Results.Ok();
        }

        var info = await TryResolveHelmReleaseInfoAsync(
            helmReleaseClient,
            helmReleaseName,
            helmReleaseNamespace,
            logger,
            cancellationToken
        );

        if (info is null)
            return Results.Ok();

        var targetEnvironment = hostEnvironment.EnvironmentName;

        var deployEvent = new DeployEventRequest
        {
            BuildId = info.BuildId,
            Message = fluxEvent.Message,
            Timestamp = fluxEvent.Timestamp,
            EventType = fluxEvent.Reason,
            Environment = targetEnvironment,
        };

        try
        {
            var httpClient = httpClientFactory.CreateClient(info.SourceEnvironment);
            var response = await httpClient.PostAsJsonAsync(
                $"designer/api/v1/{info.Org}/{info.App}/deployments/webhooks/events",
                deployEvent,
                AppJsonSerializerContext.Default.DeployEventRequest,
                cancellationToken
            );
            response.EnsureSuccessStatusCode();
            logger.LogInformation("Successfully sent deploy event to Designer for {Org}/{App}", info.Org, info.App);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send deploy event for {Name}", helmReleaseName);
        }

        return Results.Ok();
    }

    private static async Task<HelmReleaseInfo?> TryResolveHelmReleaseInfoAsync(
        HelmReleaseClient helmReleaseClient,
        string helmReleaseName,
        string helmReleaseNamespace,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        var helmRelease = await helmReleaseClient.GetAsync(helmReleaseName, helmReleaseNamespace, cancellationToken);
        if (helmRelease is not null)
        {
            var labels = helmRelease.GetLabels();

            string[] requiredLabels =
            [
                StudioLabels.BuildId,
                StudioLabels.SourceEnvironment,
                StudioLabels.Org,
                StudioLabels.App,
            ];

            foreach (var label in requiredLabels)
            {
                if (!labels.ContainsKey(label))
                {
                    logger.LogWarning("HelmRelease {Name} does not have label {Label}", helmReleaseName, label);
                    return null;
                }
            }

            return new HelmReleaseInfo(
                labels[StudioLabels.Org],
                labels[StudioLabels.App],
                labels[StudioLabels.SourceEnvironment],
                labels[StudioLabels.BuildId]
            );
        }

        logger.LogInformation("HelmRelease {Name} not found, attempting to parse values from name", helmReleaseName);

        if (!HelmReleaseNameHelper.TryParse(helmReleaseName, out var org, out var app, out var env))
        {
            logger.LogWarning(
                "Could not parse HelmRelease name: {Name}. Expected format: {{org}}-{{app}}-{{env}}",
                helmReleaseName
            );
            return null;
        }

        logger.LogInformation(
            "Parsed HelmRelease name {Name} -> Org: {Org}, App: {App}, Env: {Env}",
            helmReleaseName,
            org,
            app,
            env
        );

        return new HelmReleaseInfo(org, app, env, null);
    }

    /// <summary>
    /// Filters for relevant Flux event reasons.
    /// We'll might want to extend this in the future.
    /// https://pkg.go.dev/github.com/fluxcd/helm-controller/api/v2beta1#pkg-constants
    /// </summary>
    private static bool IsRelevantEventReason(string? reason)
    {
        return reason
            is "InstallSucceeded"
                or "InstallFailed"
                or "UpgradeSucceeded"
                or "UpgradeFailed"
                or "UninstallSucceeded"
                or "UninstallFailed";
    }
}
