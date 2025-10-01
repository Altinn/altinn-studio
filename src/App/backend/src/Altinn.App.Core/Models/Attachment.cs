namespace Altinn.App.Core.Models;

/// <summary>
/// Attachment metadata
/// </summary>
public class Attachment
{
    /// <summary>
    /// The file name
    /// </summary>
#nullable disable
    public string Name { get; set; }

    /// <summary>
    /// The id
    /// </summary>
    public string Id { get; set; }

#nullable restore

    /// <summary>
    /// The file size in bytes
    /// </summary>
    public long Size { get; set; }
}
