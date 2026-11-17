using System.Globalization;
using System.Threading.RateLimiting;
using Altinn.App.Core.Internal.Pdf;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Infrastructure.RateLimiting;

/// <summary>
/// Limits how many PDF previews the app generates across all instances, since each one renders an instance in the
/// PDF generator. See <see cref="PdfGeneratorSettings.PreviewRateLimit"/>.
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
        PdfPreviewRateLimitSettings limit = settings.Value.PreviewRateLimit;
        if (limit.PermitLimit <= 0)
        {
            return RateLimitPartition.GetNoLimiter(Name);
        }

        // A single partition, so previews of all instances share the limit
        return RateLimitPartition.GetFixedWindowLimiter(
            Name,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = limit.PermitLimit,
                Window = limit.Window,
                QueueLimit = limit.QueueLimit,
            }
        );
    }
}
