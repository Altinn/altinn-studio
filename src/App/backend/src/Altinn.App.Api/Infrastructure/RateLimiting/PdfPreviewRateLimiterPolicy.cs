using System.Globalization;
using System.Threading.RateLimiting;
using Altinn.App.Core.Internal.Pdf;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Infrastructure.RateLimiting;

/// <summary>
/// Limits how many PDF previews can be generated for an instance per minute, since each one renders the instance
/// in the PDF generator.
/// </summary>
internal sealed class PdfPreviewRateLimiterPolicy(IOptions<PdfGeneratorSettings> settings) : IRateLimiterPolicy<string>
{
    public const string Name = "AltinnPdfPreview";

    public Func<OnRejectedContext, CancellationToken, ValueTask>? OnRejected { get; } =
        (context, _) =>
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter))
            {
                context.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds)
                    .ToString(CultureInfo.InvariantCulture);
            }

            return ValueTask.CompletedTask;
        };

    public RateLimitPartition<string> GetPartition(HttpContext httpContext)
    {
        string instanceGuid = httpContext.Request.RouteValues["instanceGuid"]?.ToString() ?? string.Empty;
        int permitLimit = settings.Value.PreviewRequestsPerMinute;
        if (permitLimit <= 0)
        {
            return RateLimitPartition.GetNoLimiter(instanceGuid);
        }

        return RateLimitPartition.GetFixedWindowLimiter(
            instanceGuid,
            _ => new FixedWindowRateLimiterOptions { PermitLimit = permitLimit, Window = TimeSpan.FromMinutes(1) }
        );
    }
}
