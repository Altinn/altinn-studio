using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.App.Core.Models;

/// <summary>
/// Extension of Application model from Storage. Adds app specific attributes to the model
/// </summary>
public class ApplicationMetadata : Application
{
    /// <summary>
    /// Create new instance of ApplicationMetadata
    /// </summary>
    /// <param name="id"></param>
    public ApplicationMetadata(string id)
    {
        base.Id = id;
        AppIdentifier = new AppIdentifier(id);
    }

    /// <summary>
    /// Override Id from base to ensure AppIdentifier is set
    /// </summary>
    public new string Id
    {
        get { return base.Id; }
        set
        {
            AppIdentifier = new AppIdentifier(value);
            base.Id = value;
        }
    }

    /// <summary>
    /// List of features and status (enabled/disabled)
    /// </summary>
    [JsonProperty(PropertyName = "features")]
    public Dictionary<string, bool>? Features { get; set; }

    /// <summary>
    /// Configure options for handling what happens when entering the application
    /// </summary>
    [JsonProperty(PropertyName = "onEntry")]
    public new OnEntry? OnEntry { get; set; }

    /// <summary>
    /// Get AppIdentifier based on ApplicationMetadata.Id
    /// Updated by setting ApplicationMetadata.Id
    /// </summary>
    [System.Text.Json.Serialization.JsonIgnore]
    [Newtonsoft.Json.JsonIgnore]
    public AppIdentifier AppIdentifier { get; private set; }

    /// <summary>
    /// Configure options for setting organisation logo
    /// </summary>
    [JsonProperty(PropertyName = "logo")]
    public Logo? Logo { get; set; }

    /// <summary>
    /// Frontend sometimes need to have knowledge of the nuget package version for backwards compatibility
    /// </summary>
    [JsonProperty(PropertyName = "altinnNugetVersion")]
    public string AltinnNugetVersion { get; set; } =
        typeof(ApplicationMetadata).Assembly.GetName().Version?.ToString()
        ?? throw new Exception("Assembly version is null");

    /// <summary>
    /// Holds properties that are not mapped to other properties
    /// </summary>
    [System.Text.Json.Serialization.JsonExtensionData]
    public Dictionary<string, object>? UnmappedProperties { get; set; }
}
