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
    /// <b>Takes ownership of <paramref name="response"/> and disposes it.</b> The body is read first, with
    /// a bounded streaming read, so the resulting exception carries the diagnostic content without holding
    /// the connection open. Do not use <paramref name="response"/> afterwards.
    /// </remarks>
    /// <param name="response">The failed response. Disposed before this method returns.</param>
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
    /// <b>Takes ownership of <paramref name="response"/> and disposes it.</b> See
    /// <see cref="Create(HttpResponseMessage, CancellationToken)"/>.
    /// </remarks>
    /// <param name="response">The failed response. Disposed before this method returns.</param>
    /// <param name="message">A description of the cause of the exception.</param>
    /// <param name="innerException">The exception that caused this one, if any.</param>
    /// <param name="cancellationToken">Cancels reading the response body.</param>
    public static Task<PlatformHttpException> Create(
        HttpResponseMessage response,
        string message,
        Exception? innerException = null,
        CancellationToken cancellationToken = default
    ) => CreateCore(response, message, innerException, cancellationToken);

    /// <summary>
    /// Creates a new <see cref="PlatformHttpException"/> from a response whose body has already been
    /// read — or should not be read.
    /// </summary>
    /// <remarks>
    /// Unlike <see cref="Create(HttpResponseMessage, CancellationToken)"/> this neither reads the body
    /// nor disposes <paramref name="response"/>: the caller keeps ownership. Reading is the reason
    /// <c>Create</c> is asynchronous, so where the body has already been consumed — deserialized, or
    /// read into a string — it cannot be replayed and <c>Create</c> would capture nothing. Pass
    /// <paramref name="content"/> when you still have the body in hand so it reaches the snapshot.
    /// <para>
    /// Named to mirror <see cref="PlatformHttpResponse.FromHttpResponse"/>, which has the same
    /// contract: metadata plus whatever content you supply, and no side effects on the response.
    /// </para>
    /// </remarks>
    /// <param name="response">The failed response. Neither read nor disposed.</param>
    /// <param name="message">A description of the cause of the exception.</param>
    /// <param name="content">The already-read response body, if available.</param>
    /// <param name="innerException">The exception that caused this one, if any.</param>
    public static PlatformHttpException FromHttpResponse(
        HttpResponseMessage response,
        string message,
        string? content = null,
        Exception? innerException = null
    ) => new(PlatformHttpResponse.FromHttpResponse(response, content), message, innerException);

    private static async Task<PlatformHttpException> CreateCore(
        HttpResponseMessage response,
        string? message,
        Exception? innerException,
        CancellationToken cancellationToken
    )
    {
        ArgumentNullException.ThrowIfNull(response);

        try
        {
            PlatformHttpResponse snapshot = await PlatformHttpResponse.Snapshot(response, cancellationToken);
            return new PlatformHttpException(snapshot, message ?? snapshot.BuildMessage(), innerException);
        }
        finally
        {
            response.Dispose();
        }
    }
}
