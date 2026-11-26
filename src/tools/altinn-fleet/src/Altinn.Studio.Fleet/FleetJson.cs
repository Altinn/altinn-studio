using System.Text.Json.Serialization;

namespace Altinn.Studio.Fleet;

internal sealed record KubernetesDeployment(
    [property: JsonPropertyName("release")] string? Release,
    [property: JsonPropertyName("version")] string? Version
);

internal sealed record ReleaseLookupRequest([property: JsonPropertyName("items")] List<ReleaseLookupItem> Items);

internal sealed record ReleaseLookupResponse(
    [property: JsonPropertyName("releases")] List<ReleaseLookupResult>? Releases
);

internal sealed record ReleaseLookupItem(
    [property: JsonPropertyName("org")] string Org,
    [property: JsonPropertyName("app")] string App,
    [property: JsonPropertyName("version")] string Version
);

internal sealed record ReleaseLookupResult(
    [property: JsonPropertyName("org")] string? Org,
    [property: JsonPropertyName("app")] string? App,
    [property: JsonPropertyName("version")] string? Version,
    [property: JsonPropertyName("commit")] string? Commit,
    [property: JsonPropertyName("created")] DateTimeOffset? Created
);

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented = true
)]
[JsonSerializable(typeof(List<KubernetesDeployment>))]
[JsonSerializable(typeof(ReleaseLookupRequest))]
[JsonSerializable(typeof(ReleaseLookupResponse))]
[JsonSerializable(typeof(Store.CheckState))]
[JsonSerializable(typeof(Store.CommitJournal))]
internal sealed partial class FleetJsonContext : JsonSerializerContext;
