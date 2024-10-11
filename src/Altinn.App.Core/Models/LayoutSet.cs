namespace Altinn.App.Core.Models;

/// <summary>
/// A specific layoutset
/// </summary>
public class LayoutSet
{
    /// <summary>
    /// LayoutsetId for layout. This is the foldername
    /// </summary>
    public required string Id { get; set; }

    /// <summary>
    /// DataType for layout
    /// </summary>
    public required string DataType { get; set; }

    /// <summary>
    /// List of tasks where layout should be used
    /// </summary>
    public List<string>? Tasks { get; set; }

    /// <summary>
    /// The type description for the layout
    /// </summary>
    public string? Type { get; set; }
}
