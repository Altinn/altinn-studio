#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace LocalTest.Clients.CdnAltinnOrgs;

public class CdnOrgs
{
    [JsonPropertyName("orgs")]
    public Dictionary<string,CdnOrg>? Orgs { get; set; }
}

public class CdnOrg
{
    [JsonPropertyName("name")]
    public CdnOrgName? Name { get; set; }

    [JsonPropertyName("logo")]
    public string? Logo { get; set; }

    [JsonPropertyName("orgnr")]
    public string? Orgnr { get; set; }

    [JsonPropertyName("homepage")]
    public string? Homepage { get; set; }

    [JsonPropertyName("environments")]
    public List<string>? Environments { get; set; }

}

public class CdnOrgName
{
    [JsonPropertyName("nb")]
    public string? Nb { get; set; }

    [JsonPropertyName("nn")]
    public string? Nn { get; set; }

    [JsonPropertyName("en")]
    public string? En { get; set; }
}
