using System.Text.Json.Serialization;
using StudioGateway.Api.Designer.Contracts;
using StudioGateway.Api.Endpoints.Internal.Contracts;
using StudioGateway.Api.Endpoints.Local;
using StudioGateway.Api.Endpoints.Public;

namespace StudioGateway.Api;

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
[JsonSerializable(typeof(HealthResponse))]
[JsonSerializable(typeof(ClientIpResponse))]
[JsonSerializable(typeof(DeployEventRequest))]
internal sealed partial class AppJsonSerializerContext : JsonSerializerContext { }
