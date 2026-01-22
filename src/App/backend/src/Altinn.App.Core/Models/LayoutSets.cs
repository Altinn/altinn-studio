namespace Altinn.App.Core.Models;

/// <summary>
/// Layout sets config for a specific app containing one or more layout set
/// </summary>
public class LayoutSets
{
    /// <summary>
    /// Sets
    /// </summary>
    public required List<LayoutSet> Sets { get; set; }

    /// <summary>
    /// Ui settings
    /// </summary>
    public GlobalPageSettings? UiSettings { get; set; }
}
