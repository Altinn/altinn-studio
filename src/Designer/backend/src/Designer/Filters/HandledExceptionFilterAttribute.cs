using Altinn.Studio.Designer.Telemetry;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Filters;

/// <summary>
/// An exception filter that turns known exceptions into responses. The exceptions it handles never reach the
/// exception handler, so it records which one it handled, and its error code, on the request's root span.
/// </summary>
public abstract class HandledExceptionFilterAttribute : ExceptionFilterAttribute
{
    public sealed override void OnException(ExceptionContext context)
    {
        IActionResult? resultBefore = context.Result;
        HandleException(context);
        if (context.Result is not null && !ReferenceEquals(context.Result, resultBefore))
        {
            HandledException.Record(context.HttpContext, context.Exception, ErrorCodeOf(context.Result));
        }
    }

    /// <summary>
    /// Sets <see cref="ExceptionContext.Result"/> for the exceptions this filter handles.
    /// </summary>
    protected abstract void HandleException(ExceptionContext context);

    private static string? ErrorCodeOf(IActionResult result) =>
        result is ObjectResult { Value: ProblemDetails problemDetails }
        && problemDetails.Extensions.TryGetValue(ProblemDetailsExtensionsCodes.ErrorCode, out object? errorCode)
            ? errorCode?.ToString()
            : null;
}
