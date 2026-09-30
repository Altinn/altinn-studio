using System.Net;
using System.Text;

namespace Altinn.App.Core.Tests.TestUtils;

/// <summary>
/// Response content that records whether it was disposed, so a test can observe that the
/// <see cref="HttpResponseMessage"/> carrying it was disposed — disposing a response disposes its content.
/// </summary>
/// <remarks>
/// This is the probe for HTTP-response ownership: whether a client disposed a response is otherwise
/// invisible from the outside. The content is a real, readable body, so a response built with it behaves
/// like any other for the code under test.
/// </remarks>
internal sealed class DisposeTrackingContent : HttpContent
{
    private readonly byte[] _payload;

    /// <summary>
    /// Whether this content — and therefore the response holding it — has been disposed.
    /// </summary>
    public bool IsDisposed { get; private set; }

    public DisposeTrackingContent(string payload = "") => _payload = Encoding.UTF8.GetBytes(payload);

    /// <summary>
    /// Builds a response carrying a <see cref="DisposeTrackingContent"/>, handing back both so the caller
    /// can pass the response to the code under test and then assert on the content's disposal.
    /// </summary>
    public static (HttpResponseMessage Response, DisposeTrackingContent Content) Response(
        string payload = "",
        HttpStatusCode statusCode = HttpStatusCode.OK
    )
    {
        DisposeTrackingContent content = new(payload);
        return (new HttpResponseMessage(statusCode) { Content = content }, content);
    }

    protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) =>
        stream.WriteAsync(_payload, 0, _payload.Length);

    protected override bool TryComputeLength(out long length)
    {
        length = _payload.Length;
        return true;
    }

    protected override void Dispose(bool disposing)
    {
        IsDisposed = true;
        base.Dispose(disposing);
    }
}
