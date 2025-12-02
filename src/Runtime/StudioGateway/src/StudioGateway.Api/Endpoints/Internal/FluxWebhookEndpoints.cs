using StudioGateway.Api.Authentication;
using StudioGateway.Api.Designer.Contracts;
using StudioGateway.Api.Endpoints.Internal.Contracts;
using StudioGateway.Api.GatewayK8s;
using StudioGateway.Api.Hosting;

namespace StudioGateway.Api.Endpoints.Internal;

internal static class FluxWebhookEndpoints
{
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
        IHelmReleaseService helmReleaseService,
        IHttpClientFactory httpClientFactory,
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

        // Only process HelmRelease events
        if (fluxEvent.InvolvedObject.Kind != "HelmRelease")
        {
            logger.LogDebug("Ignoring non-HelmRelease event");
            return Results.Ok();
        }

        var helmReleaseName = fluxEvent.InvolvedObject.Name;
        var helmReleaseNamespace = fluxEvent.InvolvedObject.Namespace;

        if (string.IsNullOrEmpty(helmReleaseName) || string.IsNullOrEmpty(helmReleaseNamespace))
        {
            logger.LogWarning("HelmRelease name or namespace is missing");
            return Results.Ok();
        }

        // Fetch labels from HelmRelease
        var labels = await helmReleaseService.GetLabelsAsync(helmReleaseName, helmReleaseNamespace, cancellationToken);
        if (labels is null)
        {
            logger.LogWarning(
                "Could not fetch labels from HelmRelease: {Name} in {Namespace}",
                helmReleaseName,
                helmReleaseNamespace
            );
            return Results.Ok();
        }

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
                return Results.Ok();
            }
        }

        var org = labels[StudioLabels.Org];
        var app = labels[StudioLabels.App];

        var deployEvent = new DeployEventRequest
        {
            BuildId = labels[StudioLabels.BuildId],
            Message = fluxEvent.Message,
            Timestamp = fluxEvent.Timestamp,
            EventType = fluxEvent.Reason,
        };

        // Send the event to Designer
        try
        {
            var httpClient = httpClientFactory.CreateClient(labels[StudioLabels.SourceEnvironment]);
            var response = await httpClient.PostAsJsonAsync(
                $"/designer/api/{org}/{app}/deployments/events",
                deployEvent,
                AppJsonSerializerContext.Default.DeployEventRequest,
                cancellationToken
            );
            response.EnsureSuccessStatusCode();
            logger.LogInformation("Successfully sent deploy event to Designer for {Org}/{App}", org, app);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send deploy event to Designer for {Org}/{App}", org, app);
        }

        return Results.Ok();
    }
}
