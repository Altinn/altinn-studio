namespace Altinn.App.Core.Models;

/// <summary>
/// Layoutsets for a specific app containg one or more layoytset
/// </summary>
public class LayoutSets
{
    /// <summary>
    /// Sets
    /// </summary>
    public required List<LayoutSet> Sets { get; set; }
}
