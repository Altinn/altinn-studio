using System.Net;
using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Exception thrown when a call to one of the Altinn Platform REST services fails.
/// </summary>
public class PlatformHttpException : AltinnException
{
    /// <summary>
    /// An immutable snapshot of the failed response.
    /// </summary>
    /// <remarks>
    /// This is a snapshot, not a live <see cref="HttpResponseMessage"/>: the body has already been read
    /// and bounded, and sensitive headers are redacted. It stays valid for the lifetime of the exception.
    /// </remarks>
    public PlatformHttpResponse Response { get; }

    /// <summary>
    /// The HTTP status code of the failed response. Shorthand for <c>Response.StatusCode</c>.
    /// </summary>
    public HttpStatusCode StatusCode => Response.StatusCode;

    /// <summary>
    /// Creates a new <see cref="PlatformHttpException"/> from an existing response snapshot.
    /// </summary>
    /// <param name="response">A snapshot of the failed response.</param>
    /// <param name="message">A description of the cause of the exception.</param>
    /// <param name="innerException">The exception that caused this one, if any.</param>
    public PlatformHttpException(PlatformHttpResponse response, string message, Exception? innerException = null)
        : base(message, innerException)
    {
        ArgumentNullException.ThrowIfNull(response);
        Response = response;
    }

    /// <summary>
    /// Creates a new <see cref="PlatformHttpException"/> by snapshotting <paramref name="response"/>,
    /// deriving the message from its status, reason phrase and body.
    /// </summary>
    /// <remarks>
    /// The body is read with a bounded streaming read, so the exception carries the diagnostic content
    /// without holding on to the response. <paramref name="response"/> is borrowed, not taken over: it is
    /// neither disposed nor modified, and disposing it afterwards — as the usual <c>using</c> at the call
    /// site does — leaves the exception fully readable, which is what the snapshot is for.
    /// </remarks>
    /// <param name="response">The failed response. Read but not disposed; the caller keeps ownership.</param>
    /// <param name="cancellationToken">Cancels reading the response body.</param>
    public static Task<PlatformHttpException> Create(
        HttpResponseMessage response,
        CancellationToken cancellationToken = default
    ) => CreateCore(response, message: null, innerException: null, cancellationToken);

    /// <summary>
    /// Creates a new <see cref="PlatformHttpException"/> by snapshotting <paramref name="response"/>, using
    /// the supplied message.
    /// </summary>
    /// <remarks>
    /// <paramref name="response"/> is borrowed, not taken over. See
    /// <see cref="Create(HttpResponseMessage, CancellationToken)"/>.
    /// </remarks>
    /// <param name="response">The failed response. Read but not disposed; the caller keeps ownership.</param>
    /// <param name="message">A description of the cause of the exception.</param>
    /// <param name="innerException">The exception that caused this one, if any.</param>
    /// <param name="cancellationToken">Cancels reading the response body.</param>
    public static Task<PlatformHttpException> Create(
        HttpResponseMessage response,
        string message,
        Exception? innerException = null,
        CancellationToken cancellationToken = default
    ) => CreateCore(response, message, innerException, cancellationToken);

    private static async Task<PlatformHttpException> CreateCore(
        HttpResponseMessage response,
        string? message,
        Exception? innerException,
        CancellationToken cancellationToken
    )
    {
        ArgumentNullException.ThrowIfNull(response);

        // Deliberately does not dispose: passing an IDisposable to a method does not transfer ownership,
        // and the caller's `using` must stay in charge. The snapshot is what keeps the exception readable
        // once they do dispose it.
        PlatformHttpResponse snapshot = await PlatformHttpResponse.Snapshot(response, cancellationToken);
        return new PlatformHttpException(snapshot, message ?? snapshot.BuildMessage(), innerException);
    }
}
