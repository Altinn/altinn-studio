using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Services.Models;

public class AltinnOrgsModel
{
    [JsonPropertyName("orgs")]
    public required Dictionary<string, AltinnOrgModel> Orgs { get; set; }
}
