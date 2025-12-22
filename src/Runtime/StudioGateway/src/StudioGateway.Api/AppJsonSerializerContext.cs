using System.Text.Json.Serialization;
using StudioGateway.Api.Clients.Designer.Contracts;
using StudioGateway.Api.Endpoints.Internal.Contracts;
using StudioGateway.Api.Endpoints.Local;
using StudioGateway.Api.Endpoints.Public;
using StudioGateway.Contracts.Deploy;

namespace StudioGateway.Api;

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
[JsonSerializable(typeof(HealthResponse))]
[JsonSerializable(typeof(ClientIpResponse))]
[JsonSerializable(typeof(DeployEventRequest))]
[JsonSerializable(typeof(IsAppDeployedResponse))]
internal sealed partial class AppJsonSerializerContext : JsonSerializerContext { }
