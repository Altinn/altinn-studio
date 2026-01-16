using Microsoft.AspNetCore.WebUtilities;
using StudioGateway.Api.Clients.Designer.Contracts;
using StudioGateway.Api.Clients.K8s;
using StudioGateway.Api.Clients.SlackClient;
using StudioGateway.Api.Clients.SlackClient.Contracts;
using StudioGateway.Api.Endpoints.Internal.Contracts;
using StudioGateway.Api.Hosting;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Endpoints.Internal;

internal static class FluxWebhookEndpoints
{
    private sealed record HelmReleaseInfo(string Org, string App, string SourceEnvironment, string? BuildId);

    private static class FluxFinalEventReasons
    {
        public const string InstallSucceeded = "InstallSucceeded";
        public const string InstallFailed = "InstallFailed";
        public const string UpgradeSucceeded = "UpgradeSucceeded";
        public const string UpgradeFailed = "UpgradeFailed";
        public const string UninstallSucceeded = "UninstallSucceeded";
        public const string UninstallFailed = "UninstallFailed";
    }

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
        ISlackClient slackClient,
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

        await SendSlackNotificationAsync(
            slackClient,
            fluxEvent,
            info,
            targetEnvironment,
            helmReleaseName,
            logger,
            cancellationToken
        );

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
        var exists = await helmReleaseClient.ExistsAsync(helmReleaseName, helmReleaseNamespace, cancellationToken);
        if (exists)
        {
            var labels = await helmReleaseClient.GetLabelsAsync(
                helmReleaseName,
                helmReleaseNamespace,
                cancellationToken
            );

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
            is FluxFinalEventReasons.InstallSucceeded
                or FluxFinalEventReasons.InstallFailed
                or FluxFinalEventReasons.UpgradeSucceeded
                or FluxFinalEventReasons.UpgradeFailed
                or FluxFinalEventReasons.UninstallSucceeded
                or FluxFinalEventReasons.UninstallFailed;
    }

    private static async Task SendSlackNotificationAsync(
        ISlackClient slackClient,
        FluxEvent fluxEvent,
        HelmReleaseInfo info,
        string targetEnvironment,
        string helmReleaseName,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var emoji = GetDeployEmoji(fluxEvent.Reason);
            var status = GetDeployStatus(fluxEvent.Reason);

            var message = new SlackMessage
            {
                Text = $"{emoji} `{info.Org}` - `{targetEnvironment}` - `{info.App}` - *{status}*",
                Blocks =
                [
                    new SlackBlock
                    {
                        Type = "section",
                        Text = new SlackText { Type = "mrkdwn", Text = $"{emoji} *{status}*" },
                    },
                    new SlackBlock { Type = "context", Elements = BuildContextElements(info, targetEnvironment) },
                ],
            };

            await slackClient.SendMessageAsync(message, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Failed to send Slack notification for {Name} to {Environment}",
                helmReleaseName,
                targetEnvironment
            );
        }
    }

    private static string GetDeployEmoji(string reason)
    {
        return reason switch
        {
            FluxFinalEventReasons.InstallSucceeded
            or FluxFinalEventReasons.UpgradeSucceeded
            or FluxFinalEventReasons.UninstallSucceeded => ":white_check_mark:",
            FluxFinalEventReasons.InstallFailed
            or FluxFinalEventReasons.UpgradeFailed
            or FluxFinalEventReasons.UninstallFailed => ":x:",
            _ => ":information_source:",
        };
    }

    private static string GetDeployStatus(string reason)
    {
        return reason switch
        {
            FluxFinalEventReasons.InstallSucceeded or FluxFinalEventReasons.UpgradeSucceeded => "Deploy succeeded",
            FluxFinalEventReasons.UninstallSucceeded => "Undeploy succeeded",
            FluxFinalEventReasons.InstallFailed or FluxFinalEventReasons.UpgradeFailed => "Deploy failed",
            FluxFinalEventReasons.UninstallFailed => "Undeploy failed",
            _ => reason,
        };
    }

    private static List<SlackText> BuildContextElements(HelmReleaseInfo info, string targetEnvironment)
    {
        var elements = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"Org: `{info.Org}`" },
            new() { Type = "mrkdwn", Text = $"Env: `{targetEnvironment}`" },
            new() { Type = "mrkdwn", Text = $"App: `{info.App}`" },
            new() { Type = "mrkdwn", Text = $"Studio env: `{info.SourceEnvironment}`" },
        };

        if (info.BuildId is not null)
        {
            elements.Add(
                new SlackText
                {
                    Type = "mrkdwn",
                    Text = $"<{GrafanaPodLogsUrl(info.Org, targetEnvironment, info.App)}|Grafana>",
                }
            );
        }

        if (info.BuildId is not null)
        {
            elements.Add(
                new SlackText
                {
                    Type = "mrkdwn",
                    Text =
                        $"<https://dev.azure.com/brreg/altinn-studio/_build/results?buildId={info.BuildId}&view=logs|Build log>",
                }
            );
        }

        return elements;
    }

    private static string GrafanaPodLogsUrl(string org, string env, string app)
    {
        var isProd = AltinnEnvironments.IsProd(env);

        var baseDomain = isProd ? $"https://{org}.apps.altinn.no" : $"https://{org}.apps.tt02.altinn.no";

        var path = "/monitor/d/ae1906c2hbjeoe/pod-console-error-logs";

        var now = DateTimeOffset.UtcNow;
        var from = now.AddMinutes(-15);

        var queryParams = new Dictionary<string, string?>
        {
            ["var-rg"] = $"altinnapps-{org}-{(isProd ? "prod" : env)}-rg",
            ["var-PodName"] = $"{org}-{app}-deployment-v2",
            ["from"] = from.ToUnixTimeMilliseconds().ToString(),
            ["to"] = now.ToUnixTimeMilliseconds().ToString(),
        };

        return QueryHelpers.AddQueryString($"{baseDomain}{path}", queryParams);
    }
}
