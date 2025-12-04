using System.Text.Json.Serialization;

namespace StudioGateway.Api.Authentication;

[JsonSerializable(typeof(OidcMetadataResponse))]
[JsonSerializable(typeof(MaskinportenTokenResponse))]
internal sealed partial class MaskinportenJsonSerializerContext : JsonSerializerContext { }
