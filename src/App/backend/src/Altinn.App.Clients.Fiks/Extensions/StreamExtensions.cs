namespace Altinn.App.Clients.Fiks.Extensions;

internal static class StreamExtensions
{
    /// <summary>
    /// Reads the entire stream to a string.
    /// </summary>
    public static string ReadToString(this Stream stream, bool leaveOpen = true)
    {
        ArgumentNullException.ThrowIfNull(stream);

        if (stream.CanSeek && stream.Position != 0)
            stream.Position = 0;

        using var reader = new StreamReader(stream, leaveOpen: leaveOpen);
        return reader.ReadToEnd();
    }
}
