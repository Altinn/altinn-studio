using System;
using System.Globalization;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.Designer.Infrastructure.AppDist;

/// <summary>
/// Rejects requests that exceed the <see cref="AppDistRateLimiter"/> with 429 and a <c>Retry-After</c> header.
/// </summary>
public sealed class AppDistRateLimitFilter(AppDistRateLimiter rateLimiter) : IAsyncResourceFilter
{
    public async Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
    {
        HttpContext httpContext = context.HttpContext;
        using RateLimitLease lease = await rateLimiter.AcquireAsync(httpContext, httpContext.RequestAborted);
        if (lease.IsAcquired)
        {
            await next();
            return;
        }

        if (lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter))
        {
            httpContext.Response.Headers[HeaderNames.RetryAfter] = Math.Ceiling(retryAfter.TotalSeconds)
                .ToString(CultureInfo.InvariantCulture);
        }

        context.Result = new StatusCodeResult(StatusCodes.Status429TooManyRequests);
    }
}
