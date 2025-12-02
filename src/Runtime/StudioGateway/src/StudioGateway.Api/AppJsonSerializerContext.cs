using System.Text.Json.Serialization;
using StudioGateway.Api.Designer.Contracts;
using StudioGateway.Api.Flux.Contracts;

namespace StudioGateway.Api;

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
[JsonSerializable(typeof(DeployEventRequest))]
internal sealed partial class AppJsonSerializerContext : JsonSerializerContext { }
