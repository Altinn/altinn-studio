using System.Text.Json.Serialization;
using Microsoft.IdentityModel.Tokens;

namespace StudioGateway.Api.Authentication;

[JsonSerializable(typeof(OidcMetadataResponse))]
[JsonSerializable(typeof(MaskinportenTokenResponse))]
[JsonSerializable(typeof(JsonWebKey))]
internal sealed partial class MaskinportenJsonSerializerContext : JsonSerializerContext { }
