using System.IO;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// One of the app scaffolds a new application can be created from, e.g. "v8" or "v9". Discovered from
/// the sub folders of <see cref="Configuration.GeneralSettings.TemplateLocation"/>, each of which carries
/// an apptemplate.json manifest.
/// </summary>
public class AppTemplate
{
    private const string AppFolderName = "App";
    private const string DeploymentFolderName = "deployment";

    /// <summary>
    /// The template id, which is also its folder name.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("displayName")]
    public required string DisplayName { get; init; }

    [JsonPropertyName("description")]
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Path to the template content, i.e. the folder holding App/, deployment/ and the loose files.
    /// </summary>
    [JsonIgnore]
    public required string RootPath { get; init; }

    [JsonIgnore]
    public string AppPath => Path.Combine(RootPath, AppFolderName);

    [JsonIgnore]
    public string DeploymentPath => Path.Combine(RootPath, DeploymentFolderName);
}
