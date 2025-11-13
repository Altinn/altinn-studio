using KS.Fiks.IO.Crypto.Models;

namespace Altinn.App.Clients.Fiks.FiksIO.Models;

/// <summary>
/// A file payload to be sent with a FIKS IO message.
/// </summary>
public sealed record FiksIOMessagePayload
{
    /// <summary>
    /// The data stream
    /// </summary>
    public Stream Data { get; }

    /// <summary>
    /// The filename
    /// </summary>
    public string Filename { get; internal set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="FiksIOMessagePayload"/> class.
    /// </summary>
    /// <param name="filename">The filename.</param>
    /// <param name="data">The data.</param>
    public FiksIOMessagePayload(string filename, Stream data)
    {
        Data = data;
        Filename = filename;
    }

    /// <inheritdoc cref="FiksIOMessagePayload(string, Stream)"/>
    public FiksIOMessagePayload(string filename, ReadOnlyMemory<byte> data)
    {
        Data = new MemoryStream(data.ToArray());
        Filename = filename;
    }

    /// <summary>
    /// Gets the file extension of the payload, without the dot separator.
    /// Default behavior is to return the extension in uppercase.
    /// </summary>
    /// <param name="upperCase">Should the return value be in upper case?</param>
    public string GetDotlessFileExtension(bool upperCase = true)
    {
        var extension = Path.GetExtension(Filename) is { Length: > 1 } ext ? ext[1..] : Filename;

        return upperCase ? extension.ToUpperInvariant() : extension;
    }

    internal IPayload ToPayload() => new PayloadWrapper(Filename, Data);

    private sealed record PayloadWrapper(string Filename, Stream Payload) : IPayload;
}
