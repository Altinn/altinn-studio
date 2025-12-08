using System.Text.RegularExpressions;
using StudioGateway.Api.Authentication;
using StudioGateway.Api.Clients.Designer.Contracts;
using StudioGateway.Api.Clients.GatewayK8s;
using StudioGateway.Api.Endpoints.Internal.Contracts;
using StudioGateway.Api.Hosting;

namespace StudioGateway.Api.Endpoints.Internal;

internal static partial class FluxWebhookEndpoints
{
    // HelmRelease name format: {org}-{app}-{studio-env}
    // All parts are lowercase (Kubernetes requirement). org has no hyphens, app can have hyphens
    // Example: ttd-my-app-prod, digdir-some-app-dev
    [GeneratedRegex(@"^(?<org>[a-z0-9]+)-(?<app>[a-z0-9-]+)-(?<env>dev|staging|prod)$")]
    private static partial Regex HelmReleaseNamePattern();

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

        // Try to fetch labels from HelmRelease
        var labels = await helmReleaseService.GetLabelsAsync(helmReleaseName, helmReleaseNamespace, cancellationToken);

        string? org;
        string? app;
        string? sourceEnvironment;
        string? buildId;

        if (labels is not null)
        {
            // HelmRelease exists, extract values from labels
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

            org = labels[StudioLabels.Org];
            app = labels[StudioLabels.App];
            sourceEnvironment = labels[StudioLabels.SourceEnvironment];
            buildId = labels[StudioLabels.BuildId];
        }
        else
        {
            // HelmRelease doesn't exist (likely deleted), try to parse values from name
            // Name format: {org}-{app}-{studio-env}
            logger.LogInformation(
                "HelmRelease {Name} not found, attempting to parse values from name",
                helmReleaseName
            );

            var parsed = TryParseHelmReleaseName(helmReleaseName);
            if (parsed is null)
            {
                logger.LogWarning(
                    "Could not parse HelmRelease name: {Name}. Expected format: {{org}}-{{app}}-{{env}}",
                    helmReleaseName
                );
                return Results.Ok();
            }

            (org, app, sourceEnvironment) = parsed.Value;
            buildId = null; // BuildId is not available when HelmRelease is deleted

            logger.LogInformation(
                "Parsed HelmRelease name {Name} -> Org: {Org}, App: {App}, Env: {Env}",
                helmReleaseName,
                org,
                app,
                sourceEnvironment
            );
        }

        // Target environment is the environment where the gateway is running (e.g., at22, tt02, production)
        var targetEnvironment = hostEnvironment.EnvironmentName;

        var deployEvent = new DeployEventRequest
        {
            BuildId = buildId,
            Message = fluxEvent.Message,
            Timestamp = fluxEvent.Timestamp,
            EventType = fluxEvent.Reason,
            Environment = targetEnvironment,
        };

        // Send the event to Designer
        try
        {
            var httpClient = httpClientFactory.CreateClient(sourceEnvironment);
            var response = await httpClient.PostAsJsonAsync(
                $"designer/api/{org}/{app}/deployments/events",
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

    /// <summary>
    /// Tries to parse org, app, and environment from a HelmRelease name.
    /// Expected format: {org}-{app}-{env} where env is one of: dev, staging, prod
    /// </summary>
    private static (string Org, string App, string Env)? TryParseHelmReleaseName(string name)
    {
        var match = HelmReleaseNamePattern().Match(name);
        if (!match.Success)
        {
            return null;
        }

        return (match.Groups["org"].Value, match.Groups["app"].Value, match.Groups["env"].Value);
    }
}
