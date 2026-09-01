namespace Altinn.Studio.Gateway.Api.Application;

/// <summary>
/// Streams an upstream response through unmodified: status code, content type, and body.
/// No other upstream headers are forwarded. Owns and disposes the response message.
/// </summary>
internal sealed class UpstreamPassthroughResult(HttpResponseMessage _upstreamResponse) : IResult
{
    public async Task ExecuteAsync(HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        using var response = _upstreamResponse;

        httpContext.Response.StatusCode = (int)response.StatusCode;

        var contentType = response.Content.Headers.ContentType?.ToString();
        if (!string.IsNullOrEmpty(contentType))
            httpContext.Response.ContentType = contentType;

        await response.Content.CopyToAsync(httpContext.Response.Body, httpContext.RequestAborted);
    }
}
