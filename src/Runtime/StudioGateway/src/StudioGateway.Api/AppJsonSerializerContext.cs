using System.Text.Json.Serialization;
using StudioGateway.Api.Flux.Contracts;

namespace StudioGateway.Api;

internal sealed record HealthResponse(string Status);

internal sealed record ClientIpResponse(
    string? RemoteIp,
    string? XForwardedFor,
    string? XForwardedProto,
    string? XForwardedHost
);

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
[JsonSerializable(typeof(HealthResponse))]
[JsonSerializable(typeof(ClientIpResponse))]
internal sealed partial class AppJsonSerializerContext : JsonSerializerContext { }
