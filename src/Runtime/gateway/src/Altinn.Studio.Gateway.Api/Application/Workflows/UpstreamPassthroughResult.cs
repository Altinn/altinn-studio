using Altinn.Studio.Gateway.Contracts.Workflows;

namespace Altinn.Studio.Gateway.Api.Application;

/// <summary>
/// Streams an upstream response through unmodified: status code, content type, and body.
/// No other upstream headers are forwarded. Owns and disposes the response message.
/// </summary>
/// <remarks>
/// The body copy is bounded by <paramref name="_bodyTimeout"/>. The upstream response was read
/// headers-first, and <c>HttpClient</c> disposes its own timeout the moment the headers are in,
/// so without this an engine that answers its headers and then stalls would hang the request for
/// as long as the caller is prepared to wait. A connection to the engine that breaks off mid-body
/// is handled the same way. When either happens before the first byte the response has not
/// started and the caller gets the "engine unavailable" envelope; once bytes are on the wire the
/// only honest option left is to abort the connection, so the caller sees a truncated response
/// instead of a hang or an unhandled error.
/// </remarks>
internal sealed class UpstreamPassthroughResult(HttpResponseMessage _upstreamResponse, TimeSpan _bodyTimeout) : IResult
{
    public async Task ExecuteAsync(HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        using var response = _upstreamResponse;

        httpContext.Response.StatusCode = (int)response.StatusCode;

        var contentType = response.Content.Headers.ContentType?.ToString();
        if (!string.IsNullOrEmpty(contentType))
            httpContext.Response.ContentType = contentType;

        // Forward the declared length (when the upstream declared one) so fixed-length bodies
        // are not needlessly chunked.
        var contentLength = response.Content.Headers.ContentLength;
        if (contentLength is not null)
            httpContext.Response.ContentLength = contentLength;

        using var bodyBudget = CancellationTokenSource.CreateLinkedTokenSource(httpContext.RequestAborted);
        bodyBudget.CancelAfter(_bodyTimeout);

        try
        {
            await response.Content.CopyToAsync(httpContext.Response.Body, bodyBudget.Token);
        }
        catch (OperationCanceledException exception) when (!httpContext.RequestAborted.IsCancellationRequested)
        {
            Diagnostics(httpContext)
                .LogWarning(
                    exception,
                    "Workflow engine stalled while sending a response body; gave up after {BodyTimeout}",
                    _bodyTimeout
                );
            await OnBodyFailed(httpContext, "The workflow engine stopped responding while sending its reply.");
        }
        catch (Exception exception)
            when (exception is HttpRequestException or IOException
                && !httpContext.RequestAborted.IsCancellationRequested
            )
        {
            Diagnostics(httpContext)
                .LogWarning(exception, "Workflow engine connection broke off while sending a response body");
            await OnBodyFailed(httpContext, "The workflow engine's reply broke off before it was complete.");
        }
    }

    private static ILogger Diagnostics(HttpContext httpContext) =>
        httpContext
            .RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger(HandleWorkflows.DiagnosticsLoggerCategory);

    private static async Task OnBodyFailed(HttpContext httpContext, string detail)
    {
        if (httpContext.Response.HasStarted)
        {
            httpContext.Abort();
            return;
        }

        httpContext.Response.ContentLength = null;
        await Results
            .Problem(
                type: GatewayProblem.WorkflowEngineUnavailableType,
                title: HandleWorkflows.WorkflowEngineUnavailableTitle,
                statusCode: StatusCodes.Status502BadGateway,
                detail: detail
            )
            .ExecuteAsync(httpContext);
    }
}
