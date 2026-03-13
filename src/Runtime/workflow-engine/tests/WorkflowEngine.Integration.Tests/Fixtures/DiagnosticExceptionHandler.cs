using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;

namespace WorkflowEngine.Integration.Tests.Fixtures;

/// <summary>
/// Returns the full exception type, message, and stack trace as the response body so tests
/// can surface the root cause without modifying production exception-handling middleware.
/// </summary>
internal sealed class DiagnosticExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        httpContext.Response.ContentType = "text/plain";
        await httpContext.Response.WriteAsync(
            $"{exception.GetType().FullName}: {exception.Message}\n{exception.StackTrace}",
            cancellationToken
        );
        return true;
    }
}
