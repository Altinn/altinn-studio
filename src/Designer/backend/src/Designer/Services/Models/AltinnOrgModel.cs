#nullable disable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Services.Models;

public class AltinnOrgModel
{
    [JsonPropertyName("name")]
    public required Dictionary<string, string> Name { get; set; }

    [JsonPropertyName("logo")]
    public string Logo { get; set; }

    [JsonPropertyName("orgnr")]
    public required string OrgNr { get; set; }

    [JsonPropertyName("homepage")]
    public string Homepage { get; set; }

    [JsonPropertyName("environments")]
    public required List<string> Environments { get; set; }
}
