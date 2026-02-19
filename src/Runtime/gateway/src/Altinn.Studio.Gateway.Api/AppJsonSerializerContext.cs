using System.Text.Json.Serialization;
using Altinn.Studio.Gateway.Api.Clients.AlertsClient.Contracts;
using Altinn.Studio.Gateway.Api.Clients.Designer.Contracts;
using Altinn.Studio.Gateway.Api.Endpoints.Internal.Contracts;
using Altinn.Studio.Gateway.Api.Endpoints.Local;
using Altinn.Studio.Gateway.Api.Endpoints.Public;
using Altinn.Studio.Gateway.Contracts.Alerts;
using Altinn.Studio.Gateway.Contracts.Deploy;
using Altinn.Studio.Gateway.Contracts.Metrics;

namespace Altinn.Studio.Gateway.Api;

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
[JsonSerializable(typeof(HealthResponse))]
[JsonSerializable(typeof(ClientIpResponse))]
[JsonSerializable(typeof(DeployEventRequest))]
[JsonSerializable(typeof(IsAppDeployedResponse))]
[JsonSerializable(typeof(AppDeployment))]
[JsonSerializable(typeof(List<AppDeployment>))]
[JsonSerializable(typeof(IEnumerable<GrafanaAlertRule>))]
[JsonSerializable(typeof(IEnumerable<AlertRule>))]
[JsonSerializable(typeof(AlertPayload))]
[JsonSerializable(typeof(Alert))]
[JsonSerializable(typeof(IEnumerable<ErrorMetric>))]
[JsonSerializable(typeof(IEnumerable<AppMetric>))]
[JsonSerializable(typeof(IEnumerable<AppErrorMetric>))]
[JsonSerializable(typeof(List<AppHealthMetric>))]
[JsonSerializable(typeof(TriggerReconcileRequest))]
internal sealed partial class AppJsonSerializerContext : JsonSerializerContext { }
