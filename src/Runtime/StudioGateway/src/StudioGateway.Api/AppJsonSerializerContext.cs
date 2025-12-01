using System.Text.Json.Serialization;
using StudioGateway.Api.Flux.Contracts;

namespace StudioGateway.Api;

internal sealed record HealthResponse(string Status);

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
[JsonSerializable(typeof(HealthResponse))]
internal sealed partial class AppJsonSerializerContext : JsonSerializerContext { }
