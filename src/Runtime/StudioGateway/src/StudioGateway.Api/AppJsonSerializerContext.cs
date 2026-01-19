using System.Text.Json.Serialization;
using StudioGateway.Api.Clients.AlertsClient.Contracts;
using StudioGateway.Api.Clients.Designer.Contracts;
using StudioGateway.Api.Endpoints.Internal.Contracts;
using StudioGateway.Api.Endpoints.Local;
using StudioGateway.Api.Endpoints.Public;
using StudioGateway.Contracts.Alerts;
using StudioGateway.Contracts.Deploy;
using StudioGateway.Contracts.Metrics;

namespace StudioGateway.Api;

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
[JsonSerializable(typeof(HealthResponse))]
[JsonSerializable(typeof(ClientIpResponse))]
[JsonSerializable(typeof(DeployEventRequest))]
[JsonSerializable(typeof(IsAppDeployedResponse))]
[JsonSerializable(typeof(IEnumerable<GrafanaAlertRule>))]
[JsonSerializable(typeof(IEnumerable<AlertRule>))]
[JsonSerializable(typeof(AlertPayload))]
[JsonSerializable(typeof(IEnumerable<Alert>))]
[JsonSerializable(typeof(IEnumerable<ErrorMetric>))]
[JsonSerializable(typeof(IEnumerable<AppMetric>))]
[JsonSerializable(typeof(IEnumerable<AppErrorMetric>))]
[JsonSerializable(typeof(List<AppHealthMetric>))]
[JsonSerializable(typeof(AzureUrl))]
[JsonSerializable(typeof(TriggerReconcileRequest))]
internal sealed partial class AppJsonSerializerContext : JsonSerializerContext { }
