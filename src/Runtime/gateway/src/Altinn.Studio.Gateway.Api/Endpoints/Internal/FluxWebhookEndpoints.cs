using System.Diagnostics;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Gateway.Api.Clients.Designer.Contracts;
using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Endpoints.Internal.Contracts;
using Altinn.Studio.Gateway.Api.Telemetry;

namespace Altinn.Studio.Gateway.Api.Endpoints.Internal;

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

    public static RouteGroupBuilder MapFluxWebhookEndpoint(this RouteGroupBuilder internalApiV1)
    {
        internalApiV1
            .MapPost("/flux/webhook", HandleFluxWebhook)
            .WithName("FluxWebhook")
            .WithSummary("Receive Flux CD webhook notifications")
            .WithDescription("Endpoint for receiving event notifications from Flux CD controllers")
            .WithTags("Flux");

        return internalApiV1;
    }

    internal static async Task<IResult> HandleFluxWebhook(
        FluxEvent fluxEvent,
        HelmReleaseClient helmReleaseClient,
        IHttpClientFactory httpClientFactory,
        IHostEnvironment hostEnvironment,
        GatewayMetrics metrics,
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        // The webhook's own span. Flux sends no trace context, so it's the root of a trace of its own.
        Activity? webhookSpan = Activity.Current;
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

        var fluxReason = fluxEvent.Reason;
        webhookSpan?.SetTag(ServiceTelemetry.Attributes.FluxReason, fluxReason);

        // Each deploy event is counted once, with error.type when Designer didn't get it, however that failed.
        string? originEnvironment = null;
        string? errorType = null;
        try
        {
            var helmReleaseName = fluxEvent.InvolvedObject.Name;
            var helmReleaseNamespace = fluxEvent.InvolvedObject.Namespace;

            if (string.IsNullOrEmpty(helmReleaseName) || string.IsNullOrEmpty(helmReleaseNamespace))
            {
                logger.LogWarning("HelmRelease name or namespace is missing");
                errorType = ServiceTelemetry.ErrorTypes.HelmReleaseUnresolved;
                webhookSpan.SetError(errorType);
                return Results.Ok();
            }

            var info = await TryResolveHelmReleaseInfo(
                helmReleaseClient,
                helmReleaseName,
                helmReleaseNamespace,
                logger,
                cancellationToken
            );

            if (info is null)
            {
                errorType = ServiceTelemetry.ErrorTypes.HelmReleaseUnresolved;
                webhookSpan.SetError(errorType);
                return Results.Ok();
            }

            originEnvironment = info.SourceEnvironment;
            // The correlation keys go on both spans, so that either trace can be found from the other's.
            SetDeployEventAttributes(webhookSpan, info, fluxReason);

            errorType = await SendDeployEvent(
                fluxEvent,
                info,
                fluxReason,
                httpClientFactory,
                hostEnvironment,
                logger,
                cancellationToken
            );
            webhookSpan.SetErrorIfAny(errorType);
            return Results.Ok();
        }
        catch (Exception ex) when (errorType is null)
        {
            // Looking up the HelmRelease failed, such as an error from the Kubernetes API. The request fails with it.
            errorType = ServiceTelemetry.ErrorTypeOf(ex);
            webhookSpan.SetError(errorType);
            throw;
        }
        finally
        {
            metrics.RecordDeployEvent(fluxReason, originEnvironment, errorType);
        }
    }

    /// <summary>
    /// Passes the deploy event on to the Studio environment that deployed the app, in the deploy's own trace when the
    /// HelmRelease carries one.
    /// </summary>
    /// <returns>Why Designer didn't get the event, or null when it did.</returns>
    private static async Task<string?> SendDeployEvent(
        FluxEvent fluxEvent,
        HelmReleaseInfo info,
        string fluxReason,
        IHttpClientFactory httpClientFactory,
        IHostEnvironment hostEnvironment,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        var deployEvent = new DeployEventRequest
        {
            BuildId = info.BuildId,
            Message = fluxEvent.Message,
            Timestamp = fluxEvent.Timestamp,
            EventType = fluxEvent.Reason,
            Environment = hostEnvironment.EnvironmentName,
        };

        using Activity? activity = TryStartTraceActivity(info.TraceParent, info.TraceState, logger);
        SetDeployEventAttributes(activity, info, fluxReason);
        try
        {
            using var httpClient = httpClientFactory.CreateClient(info.SourceEnvironment);
            using var response = await httpClient.PostAsJsonAsync(
                $"designer/api/v1/{info.Org}/{info.App}/deployments/webhooks/events",
                deployEvent,
                AppJsonSerializerContext.Default.DeployEventRequest,
                cancellationToken
            );
            response.EnsureSuccessStatusCode();
            logger.LogInformation("Successfully sent deploy event to Designer for {Org}/{App}", info.Org, info.App);
            return null;
        }
        catch (Exception ex)
        {
            string errorType = ServiceTelemetry.ErrorTypeOf(ex);
            activity.SetError(errorType);
            logger.LogError(ex, "Failed to send deploy event for {Org}/{App}", info.Org, info.App);
            return errorType;
        }
    }

    private static void SetDeployEventAttributes(Activity? span, HelmReleaseInfo info, string fluxReason)
    {
        span.SetApp(info.App);
        span.SetOriginEnvironment(info.SourceEnvironment);
        span?.SetTag(ServiceTelemetry.Attributes.FluxReason, fluxReason);
        span?.SetTag(AltinnAttributes.AppDeployBuildId, info.BuildId);
    }

    private static async Task<HelmReleaseInfo?> TryResolveHelmReleaseInfo(
        HelmReleaseClient helmReleaseClient,
        string helmReleaseName,
        string helmReleaseNamespace,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        var helmRelease = await helmReleaseClient.Get(helmReleaseName, helmReleaseNamespace, cancellationToken);
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

        // The deploy's own trace, which Designer started, continues here: the gateway consumes Flux's event about it.
        var activity = ServiceTelemetry.Source.StartActivity(
            "FluxWebhook.ProcessEvent",
            ActivityKind.Consumer,
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
