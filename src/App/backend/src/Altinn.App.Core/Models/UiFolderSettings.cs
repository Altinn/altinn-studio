namespace Altinn.App.Core.Models;

/// <summary>
/// UI settings for a specific folder under App/ui/{folderId}.
/// </summary>
public class UiFolderSettings : LayoutSettings
{
    /// <summary>
    /// Default data type for the folder.
    /// </summary>
    public string? DefaultDataType { get; set; }
}
