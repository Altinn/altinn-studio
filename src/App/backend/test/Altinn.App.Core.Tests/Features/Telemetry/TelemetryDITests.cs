using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Features.Telemetry;

public class TelemetryDITests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void TelemetryFake_Is_Disposed(bool materialize)
    {
        using var scope = TelemetrySink.CreateScope();
        scope.IsDisposed.Should().BeFalse();

        var services = new ServiceCollection();
        services.AddTelemetrySink();
        var sp = services.BuildStrictServiceProvider();

        if (materialize)
        {
            var fake = sp.GetRequiredService<TelemetrySink>();
            fake.IsDisposed.Should().BeFalse();
            scope.IsDisposed.Should().BeFalse();
            sp.Dispose();
            fake.IsDisposed.Should().BeTrue();
            scope.IsDisposed.Should().BeTrue();
        }
        else
        {
            scope.IsDisposed.Should().BeFalse();
            sp.Dispose();
            scope.IsDisposed.Should().BeFalse();
        }
    }
}
