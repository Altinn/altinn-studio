using System.IO;

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
    public required string Id { get; init; }

    public required string DisplayName { get; init; }

    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Path to the template content, i.e. the folder holding App/, deployment/ and the loose files.
    /// </summary>
    public required string RootPath { get; init; }

    public string AppPath => Path.Combine(RootPath, AppFolderName);

    public string DeploymentPath => Path.Combine(RootPath, DeploymentFolderName);
}
