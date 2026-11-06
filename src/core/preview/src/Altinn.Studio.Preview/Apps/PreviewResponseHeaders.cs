using Altinn.Studio.Preview.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Preview.Apps;

/// <summary>
/// Headers on every response from the public port.
/// </summary>
/// <remarks>
/// <list type="bullet">
/// <item>Only Studio may show preview in a frame.</item>
/// <item>The browser sends no <c>Referer</c>, because a preview URL holds its session ID.</item>
/// <item>Nothing caches a response, because the working copy changes as the developer edits it.</item>
/// </list>
/// The headers are set as the response starts, because the exception handler clears the headers of a response it
/// replaces with an error.
/// </remarks>
internal sealed class PreviewResponseHeaders(RequestDelegate next, IOptions<PreviewOptions> options)
{
    private readonly string _contentSecurityPolicy =
        $"frame-ancestors {options.Value.StudioOrigin.GetLeftPart(UriPartial.Authority)}";

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            IHeaderDictionary headers = context.Response.Headers;
            headers.ContentSecurityPolicy = _contentSecurityPolicy;
            headers["Referrer-Policy"] = "no-referrer";
            headers.XContentTypeOptions = "nosniff";
            headers.CacheControl = "no-store";
            return Task.CompletedTask;
        });
        return next(context);
    }
}
