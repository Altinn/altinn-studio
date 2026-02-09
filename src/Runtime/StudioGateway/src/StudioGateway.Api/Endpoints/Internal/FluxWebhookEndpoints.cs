using System.Diagnostics;
using StudioGateway.Api.Clients.Designer.Contracts;
using StudioGateway.Api.Clients.K8s;
using StudioGateway.Api.Endpoints.Internal.Contracts;
using StudioGateway.Api.Hosting;
using StudioGateway.Api.Telemetry;

namespace StudioGateway.Api.Endpoints.Internal;

internal static class FluxWebhookEndpoints
{
    private sealed record HelmReleaseInfo(
        string Org,
        string App,
        string SourceEnvironment,
        string? BuildId,
        string? TraceParent,
        string? TraceState
    );

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

        Activity? activity = null;
        try
        {
            activity = TryStartTraceActivity(info.TraceParent, info.TraceState, logger);
            activity?.SetTag("org", info.Org);
            activity?.SetTag("app", info.App);
            activity?.SetTag("flux.reason", fluxEvent.Reason);
            activity?.SetTag("flux.build_id", info.BuildId);

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
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            logger.LogError(ex, "Failed to send deploy event for {Name}", helmReleaseName);
        }
        finally
        {
            activity?.Dispose();
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
            var annotations = helmRelease.GetAnnotations();

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
                labels[StudioLabels.BuildId],
                ResolveTraceContextValue(annotations, StudioLabels.TraceParent),
                ResolveTraceContextValue(annotations, StudioLabels.TraceState)
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

        return new HelmReleaseInfo(
            org,
            app,
            env,
            null,
            ResolveTraceContextValue(annotations: null, StudioLabels.TraceParent),
            ResolveTraceContextValue(annotations: null, StudioLabels.TraceState)
        );
    }

    private static string? ResolveTraceContextValue(
        IReadOnlyDictionary<string, string>? annotations,
        string annotationKey
    )
    {
        if (
            annotations is not null
            && annotations.TryGetValue(annotationKey, out var annotationValue)
            && !string.IsNullOrWhiteSpace(annotationValue)
        )
        {
            return annotationValue;
        }

        return null;
    }

    private static Activity? TryStartTraceActivity(string? traceParent, string? traceState, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(traceParent))
        {
            return null;
        }

        if (!ActivityContext.TryParse(traceParent, traceState, out var parentContext))
        {
            logger.LogWarning("Invalid trace context received in Flux webhook annotations");
            return null;
        }

        IEnumerable<ActivityLink>? links = null;
        if (Activity.Current?.Context is { } currentContext && !currentContext.Equals(parentContext))
        {
            links = [new ActivityLink(currentContext)];
        }

        var activity = ServiceTelemetry.Source.StartActivity(
            "FluxWebhook.ProcessEvent",
            ActivityKind.Internal,
            parentContext,
            links: links
        );
        return activity;
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
