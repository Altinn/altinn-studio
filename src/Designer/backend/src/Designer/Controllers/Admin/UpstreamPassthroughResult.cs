using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers.Admin;

/// <summary>
/// Streams an upstream response through: the status code always, and, when the upstream declared
/// JSON, its content type, declared content length and body bytes, unmodified. No other upstream
/// header is forwarded, and nothing is fabricated.
/// </summary>
/// <remarks>
/// <para>
/// The response goes out under Studio's origin, so only a JSON body is let through: anything else,
/// such as an ingress error page, is dropped rather than served as Studio content, and the status
/// alone tells the caller what happened. Every response is marked <c>nosniff</c>, so a browser takes
/// the declared type at its word.
/// </para>
/// <para>
/// The result owns the <see cref="HttpResponseMessage"/> and disposes it once MVC has executed it.
/// The action that produced the response therefore must not dispose it: the body still has to be
/// readable when the result runs, which happens after the action returns.
/// </para>
/// </remarks>
internal sealed class UpstreamPassthroughResult : IActionResult
{
    private static readonly string[] s_forwardedMediaTypes = ["application/json", "application/problem+json"];

    private readonly HttpResponseMessage _upstreamResponse;
    private readonly ILogger _logger;

    public UpstreamPassthroughResult(HttpResponseMessage upstreamResponse, ILogger logger)
    {
        ArgumentNullException.ThrowIfNull(upstreamResponse);
        ArgumentNullException.ThrowIfNull(logger);
        _upstreamResponse = upstreamResponse;
        _logger = logger;
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        using HttpResponseMessage upstream = _upstreamResponse;
        HttpResponse response = context.HttpContext.Response;

        response.StatusCode = (int)upstream.StatusCode;
        response.Headers.XContentTypeOptions = "nosniff";

        MediaTypeHeaderValue? contentType = upstream.Content.Headers.ContentType;
        long? contentLength = upstream.Content.Headers.ContentLength;
        if (!IsForwarded(contentType))
        {
            if (contentType is not null || contentLength > 0)
            {
                _logger.LogWarning(
                    "Runtime gateway answered {StatusCode} with a {MediaType} body; only the status was forwarded",
                    (int)upstream.StatusCode,
                    contentType?.MediaType ?? "untyped"
                );
            }
            return;
        }

        response.ContentType = contentType!.ToString();

        // Forward the declared length (when the upstream declared one) so fixed-length bodies
        // are not needlessly chunked.
        if (contentLength is not null)
        {
            response.ContentLength = contentLength;
        }

        await upstream.Content.CopyToAsync(response.Body, context.HttpContext.RequestAborted);
    }

    private static bool IsForwarded(MediaTypeHeaderValue? contentType) =>
        contentType?.MediaType is { } mediaType
        && s_forwardedMediaTypes.Contains(mediaType, StringComparer.OrdinalIgnoreCase);
}
