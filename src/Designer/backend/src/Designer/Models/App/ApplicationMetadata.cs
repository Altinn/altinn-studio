using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.App;

/// <summary>
/// Studio facade for application metadata model
/// </summary>
public class ApplicationMetadata(string id) : Altinn.App.Core.Models.ApplicationMetadata(id)
{
    /// <summary>
    /// Gets or sets the altinn nuget version
    /// Overrides the base class property to initialize with null value
    /// </summary>
    public new string? AltinnNugetVersion { get; set; }
}

public class AppMetadataTranslatedString
{
    public string? Nb { get; set; }
    public string? En { get; set; }
    public string? Nn { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? OtherLanguages { get; set; }
}
