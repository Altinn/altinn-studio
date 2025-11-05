#nullable disable
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Class representing the settings found in .altinnstudio/settings.json
/// </summary>
public class AltinnStudioSettings
{
    /// <summary>
    /// The type of Altinn repository ie. if this an app or data-models repository.
    /// </summary>
    [JsonPropertyName("repoType")]
    public AltinnRepositoryType RepoType { get; set; }
    [JsonPropertyName("imports")]
    public ImportedResources Imports { get; set; }

    /// <summary>
    /// Gets and sets whether to add nullable? to reference types.
    /// Default value is <c>false</c> for old applications and true for new ones.
    /// </summary>
    [JsonPropertyName("useNullableReferenceTypes")]
    public bool UseNullableReferenceTypes { get; set; }
}

public class ImportedResources
{
    [JsonPropertyName("codeLists")]
    public Dictionary<string, ImportMetadata> CodeLists { get; set; }
}

public class ImportMetadata
{
    [JsonPropertyName("importDate")]
    public string ImportDate { get; set; }
    [JsonPropertyName("importSource")]
    public string ImportSource { get; set; }
    [JsonPropertyName("version")]
    public string Version { get; set; }
}
