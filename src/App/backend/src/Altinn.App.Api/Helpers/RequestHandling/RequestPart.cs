namespace Altinn.App.Api.Helpers.RequestHandling;

/// <summary>
/// A helper to organise the parts in a multipart
/// </summary>
public class RequestPart
{
    /// <summary>
    /// The stream to access this part.
    /// </summary>
    public required byte[] Bytes { get; set; }

    /// <summary>
    /// The file name as given in content description.
    /// </summary>
    public required string? FileName { get; set; }

    /// <summary>
    /// The parts name.
    /// </summary>
    public required string? Name { get; set; }

    /// <summary>
    /// The content type of the part.
    /// </summary>
    public required string ContentType { get; set; }

    /// <summary>
    /// The file size of the part
    /// </summary>
    public long FileSize => Bytes.Length;
}
