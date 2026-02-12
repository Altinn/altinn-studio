namespace Altinn.App.Core.Models;

/// <summary>
/// Defines the layout settings
/// </summary>
public class LayoutSettings
{
    /// <summary>
    /// Default data type for the layout folder.
    /// </summary>
    public string? DefaultDataType { get; set; }

    /// <summary>
    /// Pages
    /// </summary>
    public Pages? Pages { get; set; }

    /// <summary>
    /// Components
    /// </summary>
    public Components? Components { get; set; }
}
