using System.Buffers;
using System.IO.Pipelines;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Core.Extensions;

/// <summary>
/// Extension methods for <see cref="HttpContext"/>
/// </summary>
public static class HttpContextExtensions
{
    /// <summary>
    /// Reads the request body and returns it as a <see cref="StreamContent"/>
    /// </summary>
    public static StreamContent CreateContentStream(this HttpRequest request)
    {
        StreamContent content = new StreamContent(request.Body);
        ArgumentNullException.ThrowIfNull(request.ContentType);
        content.Headers.ContentType = MediaTypeHeaderValue.Parse(request.ContentType);

        if (request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
        {
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse(headerValues.ToString());
        }

        return content;
    }

    /// <summary>
    /// Reads the request body and returns it as a byte array using PipeReader and the content-length header
    /// to ensure minimal memory copies
    ///
    /// Missing utility function in AspNetCore
    /// </summary>
    /// <param name="request">The http request</param>
    /// <param name="maxLength">The longest body to read</param>
    /// <returns>byte array or null if maxLength is exceeded and the actual length</returns>
    /// <exception cref="InvalidOperationException"></exception>
    internal static async Task<(byte[]?, long actualLength)> ReadBodyAsByteArrayAsync(
        this HttpRequest request,
        long? maxLength
    )
    {
        maxLength ??= int.MaxValue; // about 2 GB (if we need more we should save directly to storage)
        // If the request has a too large content length, return null and error
        var contentLength =
            request.ContentLength ?? throw new InvalidOperationException("Content-Length header is missing");
        if (contentLength > maxLength)
        {
            return (null, contentLength);
        }

        // Preallocate the buffer based on Content-Length
        var buffer = new byte[contentLength];
        int bytesWritten = 0;
        PipeReader reader = request.BodyReader;
        while (bytesWritten < contentLength)
        {
            var readResult = await reader.ReadAsync();
            var bufferLength = (int)readResult.Buffer.Length;
            if (bytesWritten + bufferLength > contentLength)
            {
                // If the request has a too large content length, return null and error
                // Don't bother figuring out how much of the request is left to read
                return (null, bytesWritten + bufferLength);
            }
            readResult.Buffer.CopyTo(buffer.AsSpan(bytesWritten, bufferLength));
            bytesWritten += bufferLength;
            reader.AdvanceTo(readResult.Buffer.End);

            // Check if the stream is completed
            if (readResult.IsCompleted)
            {
                break;
            }

            // Handle possible cancellation of the read operation
            if (readResult.IsCanceled)
            {
                throw new OperationCanceledException("The request body read was canceled.");
            }
        }

        // Check if the number of bytes read matches the content length
        if (bytesWritten != contentLength)
        {
            throw new InvalidOperationException(
                $"Content length mismatch. Expected {contentLength}, but read {bytesWritten}."
            );
        }

        return (buffer, contentLength);
    }
}
