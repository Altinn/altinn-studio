using System;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Telemetry;

/// <summary>
/// Records an exception that Designer turned into an expected response, such as a 4xx, rather than a server error. The
/// exception handler doesn't log or record those, so the request's root span is where it can be found.
/// </summary>
internal static class HandledException
{
    public static void Record(HttpContext httpContext, Exception exception, string? errorCode = null)
    {
        var rootSpan = RootSpan.Of(httpContext);
        rootSpan?.SetTag(ServiceTelemetry.Attributes.Error.ExceptionType, exception.GetType().FullName);
        if (errorCode is not null)
        {
            rootSpan?.SetTag(ServiceTelemetry.Attributes.Error.Code, errorCode);
        }
    }
}
