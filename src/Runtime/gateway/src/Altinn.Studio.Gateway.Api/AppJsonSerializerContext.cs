using System.Text.Json.Serialization;
using Altinn.Studio.Gateway.Api.Clients.AlertsClient.Contracts;
using Altinn.Studio.Gateway.Api.Clients.Designer.Contracts;
using Altinn.Studio.Gateway.Api.Endpoints.Internal.Contracts;
using Altinn.Studio.Gateway.Api.Endpoints.Local;
using Altinn.Studio.Gateway.Api.Endpoints.Public;
using Altinn.Studio.Gateway.Contracts.Alerts;
using Altinn.Studio.Gateway.Contracts.Deploy;
using Altinn.Studio.Gateway.Contracts.Metrics;
using Altinn.Studio.Gateway.Contracts.Workflows;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Gateway.Api;

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
[JsonSerializable(typeof(HealthResponse))]
[JsonSerializable(typeof(ClientIpResponse))]
[JsonSerializable(typeof(DeployEventRequest))]
[JsonSerializable(typeof(IsAppDeployedResponse))]
[JsonSerializable(typeof(AppDeployment))]
[JsonSerializable(typeof(List<AppDeployment>))]
[JsonSerializable(typeof(RunningAppDeployment))]
[JsonSerializable(typeof(IEnumerable<GrafanaAlertRule>))]
[JsonSerializable(typeof(IEnumerable<AlertRule>))]
[JsonSerializable(typeof(AlertPayload))]
[JsonSerializable(typeof(Alert))]
[JsonSerializable(typeof(IEnumerable<Metric>))]
[JsonSerializable(typeof(IEnumerable<ErrorMetric>))]
[JsonSerializable(typeof(IEnumerable<AppMetric>))]
[JsonSerializable(typeof(IEnumerable<AppErrorMetric>))]
[JsonSerializable(typeof(ReportMetrics))]
[JsonSerializable(typeof(IEnumerable<AllAppsErrorMetric>))]
[JsonSerializable(typeof(AppActivityMetricsResponse))]
[JsonSerializable(typeof(AppActivitySignalsResponse))]
[JsonSerializable(typeof(List<AppHealthMetric>))]
[JsonSerializable(typeof(TriggerReconcileRequest))]
[JsonSerializable(typeof(FailWorkflowRequest))]
// Results.Problem writes it, and the AOT image has no reflection fallback.
[JsonSerializable(typeof(ProblemDetails))]
internal sealed partial class AppJsonSerializerContext : JsonSerializerContext { }
