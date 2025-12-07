namespace StudioGateway.Api.Authentication;

internal sealed class MaskinportenSettings
{
    public string[] MetadataAddresses { get; set; } = [];

    public string ClientMetadataAddress { get; set; } = "";

    public string RequiredScope { get; set; } = "";
}

internal sealed class MaskinportenClientSettings
{
    public string ClientId { get; set; } = "";

    public string Jwk { get; set; } = "";
}
