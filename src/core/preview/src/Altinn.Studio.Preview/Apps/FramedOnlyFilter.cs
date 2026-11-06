namespace Altinn.Studio.Preview.Apps;

/// <summary>
/// Refuses to open preview as a page of its own. A session can serve any page from a repository, so a preview link
/// opened in a browser's address bar could show a page anyone with push access wrote, on a domain that looks
/// official. Preview pages open only in Studio's frame, where <c>frame-ancestors</c> already limits them to Studio.
/// </summary>
/// <remarks>
/// Browsers name what a request is for in <c>Sec-Fetch-Dest</c>, and a page in the address bar is a <c>document</c>.
/// A request without the header doesn't come from a browser, so there is no one to mislead.
/// </remarks>
internal sealed class FramedOnlyFilter : IEndpointFilter
{
    private const string FetchDestinationHeader = "Sec-Fetch-Dest";
    private const string TopLevelDocument = "document";

    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next) =>
        string.Equals(
            context.HttpContext.Request.Headers[FetchDestinationHeader],
            TopLevelDocument,
            StringComparison.OrdinalIgnoreCase
        )
            ? ValueTask.FromResult<object?>(Results.NotFound())
            : next(context);
}
