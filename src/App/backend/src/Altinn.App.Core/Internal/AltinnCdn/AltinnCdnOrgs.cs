using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.AltinnCdn;

internal sealed record AltinnCdnOrgDetails
{
    [JsonPropertyName("name")]
    [JsonRequired]
    public required AltinnCdnOrgName Name { get; init; }

    [JsonPropertyName("logo")]
    public string? Logo { get; init; }

    [JsonPropertyName("emblem")]
    public string? Emblem { get; init; }

    [JsonPropertyName("orgnr")]
    public string? Orgnr { get; set; }

    [JsonPropertyName("homepage")]
    public string? Homepage { get; init; }

    [JsonPropertyName("environments")]
    [JsonRequired]
    public required List<string> Environments { get; init; }

    [JsonPropertyName("contact")]
    public AltinnCdnOrgContact? Contact { get; init; }
}

internal sealed record AltinnCdnOrgName
{
    [JsonPropertyName("nb")]
    [JsonRequired]
    public required string Nb { get; init; }

    [JsonPropertyName("nn")]
    [JsonRequired]
    public required string Nn { get; init; }

    [JsonPropertyName("en")]
    [JsonRequired]
    public required string En { get; init; }
}

internal sealed record AltinnCdnOrgContact
{
    [JsonPropertyName("phone")]
    public string? Phone { get; init; }

    [JsonPropertyName("url")]
    public string? Url { get; init; }
}
