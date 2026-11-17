namespace Altinn.App.Core.Models;

/// <summary>
/// PageGroup
/// </summary>
public class PageGroup
{
    /// <summary>
    /// Optional group type.
    /// </summary>
    public string? Type { get; set; }

    /// <summary>
    /// Optional flag controlling completion mark behavior.
    /// </summary>
    public bool? MarkWhenCompleted { get; set; }

    /// <summary>
    /// Whether the navigation group and its subforms start expanded.
    /// </summary>
    public bool? ExpandedByDefault { get; set; }

    /// <summary>
    /// Name
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Order
    /// </summary>
    public required List<string> Order { get; set; }
}
