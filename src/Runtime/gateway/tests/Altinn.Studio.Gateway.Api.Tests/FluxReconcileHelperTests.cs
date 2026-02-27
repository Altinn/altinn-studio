using System.Globalization;
using Altinn.Studio.Gateway.Api.Clients.K8s;
using Microsoft.Extensions.Time.Testing;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class FluxReconcileHelperTests
{
    [Fact]
    public void TimestampFormat_ProducesExpectedFormat()
    {
        var testDate = new DateTime(2024, 12, 18, 10, 30, 45, 123, DateTimeKind.Utc).AddTicks(4567);

        var timestamp = testDate.ToString(FluxReconcileHelper.TimestampFormat, CultureInfo.InvariantCulture);

        Assert.Equal("2024-12-18T10:30:45.1234567Z", timestamp);
    }

    [Fact]
    public void TimestampFormat_MatchesExpectedPattern()
    {
        var fakeTime = new FakeTimeProvider(DateTimeOffset.UtcNow);
        var utcNow = fakeTime.GetUtcNow().UtcDateTime;

        var timestamp = utcNow.ToString(FluxReconcileHelper.TimestampFormat, CultureInfo.InvariantCulture);

        Assert.Matches(FluxApi.TimestampPattern(), timestamp);
    }

    [Fact]
    public void TimestampFormat_EndsWithZ_NotOffset()
    {
        var fakeTime = new FakeTimeProvider(DateTimeOffset.UtcNow);
        var utcNow = fakeTime.GetUtcNow().UtcDateTime;

        var timestamp = utcNow.ToString(FluxReconcileHelper.TimestampFormat, CultureInfo.InvariantCulture);

        Assert.EndsWith("Z", timestamp, StringComparison.Ordinal);
        Assert.DoesNotContain("+", timestamp, StringComparison.Ordinal);
    }

    [Fact]
    public void TimestampFormat_HasSevenFractionalDigits()
    {
        var testDate = new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);

        var timestamp = testDate.ToString(FluxReconcileHelper.TimestampFormat, CultureInfo.InvariantCulture);

        Assert.Equal("2024-01-01T00:00:00.0000000Z", timestamp);
    }
}
