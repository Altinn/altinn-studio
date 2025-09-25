namespace Altinn.App.Core.Models;

/// <summary>
/// Pages
/// </summary>
public class Pages
{
    /// <summary>
    /// Order
    /// </summary>
    public List<string>? Order { get; set; }

    /// <summary>
    /// Groups
    /// </summary>
    public List<PageGroup>? Groups { get; set; }

    /// <summary>
    /// Exclude from pdf
    /// </summary>
    public List<string>? ExcludeFromPdf { get; set; }
}
