namespace Altinn.App.Core.Models;

/// <summary>
/// PageGroup
/// </summary>
public class PageGroup
{
    /// <summary>
    /// Name
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Order
    /// </summary>
    public required List<string> Order { get; set; }
}
