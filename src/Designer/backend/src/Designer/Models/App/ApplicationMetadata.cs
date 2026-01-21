using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Enums;

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

    public AppMetadataTranslatedString? Description { get; set; }

    public AppMetadataAccess? Access { get; set; }

    public List<AppMetadataContactPoint>? ContactPoints { get; set; }

    public AppMetadataTranslatedString? ServiceName { get; set; }
}

public class AppMetadataContactPoint
{
    public string? Category { get; set; }
    public string? Email { get; set; }
    public string? Telephone { get; set; }
    public string? ContactPage { get; set; }
}

public class AppMetadataAccess
{
    public AppMetadataTranslatedString? RightDescription { get; set; }
    public bool? Delegable { get; set; }
    public List<ResourcePartyType>? AvailableForType { get; set; }
}

public class AppMetadataTranslatedString
{
    public string? Nb { get; set; }
    public string? En { get; set; }
    public string? Nn { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? OtherLanguages { get; set; }
}
