using System;
using System.Threading;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Infrastructure.AppDist;

/// <summary>
/// Rate limits anonymous calls to the app-dist endpoints per client address. Authenticated callers are not limited.
/// </summary>
/// <remarks>
/// This is a disposable singleton rather than the ASP.NET Core rate limiting middleware because that middleware never
/// disposes its partitioned limiter. Its replenishment timer then keeps every stopped host alive, which exhausts
/// memory in the integration test suite where each test starts its own host.
/// </remarks>
public sealed class AppDistRateLimiter(IOptionsMonitor<AppDistSettings> settings) : IAsyncDisposable
{
    private const string AuthenticatedPartition = "authenticated";
    private const string UnknownClientPartition = "unknown-client";

    private readonly PartitionedRateLimiter<HttpContext> _limiter = PartitionedRateLimiter.Create<HttpContext, string>(
        httpContext => PartitionFor(httpContext, settings.CurrentValue)
    );

    public ValueTask<RateLimitLease> AcquireAsync(HttpContext httpContext, CancellationToken cancellationToken) =>
        _limiter.AcquireAsync(httpContext, permitCount: 1, cancellationToken);

    public ValueTask DisposeAsync() => _limiter.DisposeAsync();

    private static RateLimitPartition<string> PartitionFor(HttpContext httpContext, AppDistSettings settings)
    {
        if (httpContext.User.Identity?.IsAuthenticated == true)
        {
            return RateLimitPartition.GetNoLimiter(AuthenticatedPartition);
        }

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
