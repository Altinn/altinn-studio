using System.Text.Json.Serialization;
using StudioGateway.Api.Flux.Contracts;

namespace StudioGateway.Api;

[JsonSerializable(typeof(FluxEvent))]
[JsonSerializable(typeof(ObjectReference))]
public partial class AppJsonSerializerContext : JsonSerializerContext
{
}