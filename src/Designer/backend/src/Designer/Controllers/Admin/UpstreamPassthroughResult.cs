using System;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Admin;

/// <summary>
/// Streams an upstream response through unmodified: status code, content type, declared content
/// length, and body bytes. No other upstream header is forwarded, and nothing is fabricated —
/// an upstream response without a content type stays without one.
/// </summary>
/// <remarks>
/// The result owns the <see cref="HttpResponseMessage"/> and disposes it once MVC has executed it.
/// The action that produced the response therefore must not dispose it: the body still has to be
/// readable when the result runs, which happens after the action returns.
/// </remarks>
internal sealed class UpstreamPassthroughResult : IActionResult
{
    private readonly HttpResponseMessage _upstreamResponse;

    public UpstreamPassthroughResult(HttpResponseMessage upstreamResponse)
    {
        ArgumentNullException.ThrowIfNull(upstreamResponse);
        _upstreamResponse = upstreamResponse;
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        using HttpResponseMessage upstream = _upstreamResponse;
        HttpResponse response = context.HttpContext.Response;

        response.StatusCode = (int)upstream.StatusCode;

        string? contentType = upstream.Content.Headers.ContentType?.ToString();
        if (!string.IsNullOrEmpty(contentType))
        {
            response.ContentType = contentType;
        }

        // Forward the declared length (when the upstream declared one) so fixed-length bodies
        // are not needlessly chunked.
        long? contentLength = upstream.Content.Headers.ContentLength;
        if (contentLength is not null)
        {
            response.ContentLength = contentLength;
        }

        await upstream.Content.CopyToAsync(response.Body, context.HttpContext.RequestAborted);
    }
}
