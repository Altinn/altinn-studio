using System.Text.Json.Serialization;
using StudioGateway.Api.Flux.Contracts;

namespace StudioGateway.Api;

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
internal sealed partial class AppJsonSerializerContext : JsonSerializerContext { }
