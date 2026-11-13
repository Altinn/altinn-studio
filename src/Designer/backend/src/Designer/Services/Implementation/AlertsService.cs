using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class AlertsService(
    IRuntimeGatewayClient runtimeGatewayClient,
    IHubContext<AlertsUpdatedHub, IAlertsUpdateClient> alertsUpdatedHubContext,
    INotificationService notificationService,
    IHostEnvironment hostEnvironment,
    GeneralSettings generalSettings
) : IAlertsService
{
    /// <summary>
    /// The rule in <c>infra/runtime/grafana-manifests/alert-rules</c> that fires when a workflow step in a v9 app has
    /// failed for good or has kept failing for an hour.
    /// </summary>
    internal const string FailedWorkflowCallbacksRuleId = "failed_workflow_callback_requests";

    private const string FailedWorkflowCallbacksBody =
        "Et steg i en arbeidsflyt har fått en varig feil, eller har feilet i over en time. "
        + "I Studio ser du hva som feilet. Rett feilen i appen, og prøv arbeidsflyten på nytt fra instansen.";

    // Slack shows at most ten elements in a context block, and every alert has two links already.
    private const int MaxStudioLinks = 5;

    /// <inheritdoc />
    public async Task<IEnumerable<AlertRule>> GetAlertRulesAsync(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        return await runtimeGatewayClient.GetAlertRulesAsync(org, environment, cancellationToken);
    }

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(
        string org,
        AltinnEnvironment environment,
        Alert alert,
        CancellationToken cancellationToken
    )
    {
        var apps = alert
            .Apps.Where(app => app.Instances.Any(i => i.Status == "firing"))
            .Select(app => app.App)
            .ToList();

        if (apps.Count > 0)
        {
            // Every alert that notifies anyone is kept in traces, so each of its deliveries can be looked up.
            Activity.Current.SetAlwaysSample();

            var fields = new List<(string, string)>
            {
                ("Organisasjon", org),
                ("Miljø", environment.Name),
                (apps.Count == 1 ? "Applikasjon" : "Applikasjoner", string.Join(", ", apps)),
            };
            if (!hostEnvironment.IsProduction())
            {
                fields.Add(("Studio-miljø", hostEnvironment.EnvironmentName));
            }

            var links = new List<(string, string)>
            {
                (alert.Url.OriginalString, "Grafana"),
                (alert.LogsUrl.OriginalString, "Application Insights"),
            };

            string body = "";
            if (alert.RuleId == FailedWorkflowCallbacksRuleId)
            {
                links.AddRange(StudioLinks(org, environment, alert));
                body = FailedWorkflowCallbacksBody;
            }

            var payload = new NotificationPayload(alert.Id, alert.Name, fields, links, body, Emoji: "❌");
            await Task.WhenAll(
                notificationService.NotifyInternalAsync(
                    org,
                    environment,
                    NotificationKind.Alert,
                    payload,
                    cancellationToken
                ),
                notificationService.NotifyServiceOwnersAsync(
                    org,
                    environment,
                    NotificationKind.Alert,
                    payload,
                    cancellationToken
                )
            );
        }

        await alertsUpdatedHubContext.Clients.Group(org).AlertsUpdated(new AlertsUpdated(environment.Name));
    }

    /// <summary>
    /// Links to the admin panel, where the service owner sees an instance's workflows and resumes a failed one. With
    /// more firing instances than fit, it links to the apps instead, whose instance lists show each one's state.
    /// </summary>
    private IEnumerable<(string Url, string Label)> StudioLinks(string org, AltinnEnvironment environment, Alert alert)
    {
        var instances = alert
            .Apps.SelectMany(app =>
                app.Instances.Where(instance =>
                        instance.Status == "firing" && Guid.TryParse(instance.InstanceId, out _)
                    )
                    .Select(instance => (app.App, InstanceGuid: Guid.Parse(instance.InstanceId).ToString("D")))
            )
            .Distinct()
            .ToList();

        string appsUrl =
            $"https://{generalSettings.HostName}/admin/{Uri.EscapeDataString(org)}/apps/{StudioEnvironmentName(environment)}";

        if (instances.Count <= MaxStudioLinks)
        {
            return instances.Select(instance =>
                (
                    $"{appsUrl}/{Uri.EscapeDataString(instance.App)}/instances/{instance.InstanceGuid}",
                    $"Studio: {instance.App}, instans {instance.InstanceGuid}"
                )
            );
        }

        return instances
            .Select(instance => instance.App)
            .Distinct()
            .Take(MaxStudioLinks)
            .Select(app => ($"{appsUrl}/{Uri.EscapeDataString(app)}", $"Studio: {app}"));
    }

    // The gateway names production "prod", and Studio's admin panel "production".
    private static string StudioEnvironmentName(AltinnEnvironment environment) =>
        environment.IsProd() ? "production" : environment.Name;
}
