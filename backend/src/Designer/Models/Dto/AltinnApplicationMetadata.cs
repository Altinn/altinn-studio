using Altinn.App.Core.Models;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models.Dto;

public class AltinnApplicationMetadata : ApplicationMetadata
{
    //
    // Summary
    //     Create new instance of ApplicationMetadata
    //
    // Parameters:
    //   id:
    public AltinnApplicationMetadata(string id) : base(id)
    {

    }

    /// <summary>
    /// Frontend sometimes need to have knowledge of the nuget package version for backwards compatibility
    /// </summary>
    [JsonProperty(PropertyName = "altinnNugetVersion")]
    public string AltinnNugetVersion { get; set; }
}
