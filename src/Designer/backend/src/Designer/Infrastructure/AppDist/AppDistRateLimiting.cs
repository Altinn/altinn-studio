using System;
using System.Globalization;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.Designer.Infrastructure.AppDist;

/// <summary>
/// Rate limits anonymous calls to the app-dist endpoints per client address. Authenticated callers are not limited.
/// </summary>
public static class AppDistRateLimiting
{
    public const string PolicyName = "AppDistAnonymous";

    private const string AuthenticatedPartition = "authenticated";
    private const string UnknownClientPartition = "unknown-client";

    public static IServiceCollection AddAppDistRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = (context, _) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter))
                {
                    context.HttpContext.Response.Headers[HeaderNames.RetryAfter] = Math.Ceiling(retryAfter.TotalSeconds)
                        .ToString(CultureInfo.InvariantCulture);
                }

                return ValueTask.CompletedTask;
            };
            options.AddPolicy(PolicyName, PartitionFor);
        });

        return services;
    }

    private static RateLimitPartition<string> PartitionFor(HttpContext httpContext)
    {
        if (httpContext.User.Identity?.IsAuthenticated == true)
        {
            return RateLimitPartition.GetNoLimiter(AuthenticatedPartition);
        }

        AppDistSettings settings = httpContext
            .RequestServices.GetRequiredService<IOptionsMonitor<AppDistSettings>>()
            .CurrentValue;
        string client = httpContext.Connection.RemoteIpAddress?.ToString() ?? UnknownClientPartition;
        return RateLimitPartition.GetFixedWindowLimiter(
            client,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = settings.AnonymousRequestLimitPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }
        );
    }
}
