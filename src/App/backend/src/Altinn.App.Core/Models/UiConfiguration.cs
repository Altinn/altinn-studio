namespace Altinn.App.Core.Models;

/// <summary>
/// Bootstrapped UI configuration.
/// </summary>
public class UiConfiguration
{
    /// <summary>
    /// Per-folder settings parsed from App/ui/{folderId}/Settings.json.
    /// </summary>
    public required Dictionary<string, LayoutSettings> Folders { get; set; }

    /// <summary>
    /// Global settings parsed from App/ui/Settings.json.
    /// </summary>
    public GlobalPageSettings? Settings { get; set; }
}
