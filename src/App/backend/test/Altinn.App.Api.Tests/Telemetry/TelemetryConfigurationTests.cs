using System.Reflection;
using Altinn.App.Core.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace Altinn.App.Api.Tests;

public class TelemetryConfigurationTests
{
    [Fact]
    public async Task OpenTelemetry_Registers_Correctly()
    {
        List<KeyValuePair<string, string?>> configData = [new("ApplicationInsights:InstrumentationKey", "test")];
        Telemetry? telemetry = null;
        await using (var app = AppBuilder.Build(configData: configData))
        {
            telemetry = app.Services.GetService<Telemetry>();
            Assert.NotNull(telemetry);
            Assert.True(telemetry.IsInitialized);
            Assert.False(telemetry.IsDisposed);
        }
        Assert.True(telemetry.IsDisposed);
    }

    [Fact]
    public async Task OpenTelemetry_Development_Default_Sampler_Is_AlwaysOnSampler()
    {
        List<KeyValuePair<string, string?>> configData = [new("ApplicationInsights:InstrumentationKey", "test")];
        await using var app = AppBuilder.Build(configData: configData);

        var traceProvider = app.Services.GetRequiredService<TracerProvider>();

        var sampler = GetSampler(traceProvider);
        Assert.IsType<AlwaysOnSampler>(sampler);
    }

    [Fact]
    public async Task OpenTelemetry_Development_Default_MetricReaderOptions()
    {
        List<KeyValuePair<string, string?>> configData = [new("ApplicationInsights:InstrumentationKey", "test")];
        await using var app = AppBuilder.Build(configData: configData);

        var options = app.Services.GetRequiredService<IOptions<PeriodicExportingMetricReaderOptions>>().Value;

        Assert.Equal(10_000, options.ExportIntervalMilliseconds);
        Assert.Equal(8_000, options.ExportTimeoutMilliseconds);
    }

    [Fact]
    public async Task OpenTelemetry_Sampler_Override_Is_Possible()
    {
        List<KeyValuePair<string, string?>> configData = [new("ApplicationInsights:InstrumentationKey", "test")];
        var samplerToUse = new ParentBasedSampler(new AlwaysOnSampler());
        await using var app = AppBuilder.Build(
            configData: configData,
            registerCustomAppServices: services =>
            {
                services.ConfigureOpenTelemetryTracerProvider(builder =>
                {
                    builder.SetSampler(samplerToUse);
                });
            }
        );

        var traceProvider = app.Services.GetRequiredService<TracerProvider>();

        var sampler = GetSampler(traceProvider);
        Assert.Same(samplerToUse, sampler);
    }

    [Fact]
    public async Task OpenTelemetry_MetricReaderOptions_Override_Is_Possible_Through_Configure()
    {
        List<KeyValuePair<string, string?>> configData = [new("ApplicationInsights:InstrumentationKey", "test")];

        var intervalToUse = 5_000;
        var timeoutToUse = 4_000;
        await using var app = AppBuilder.Build(
            configData: configData,
            registerCustomAppServices: services =>
            {
                services.Configure<PeriodicExportingMetricReaderOptions>(options =>
                {
                    options.ExportIntervalMilliseconds = intervalToUse;
                    options.ExportTimeoutMilliseconds = timeoutToUse;
                });
            }
        );

        var options = app.Services.GetRequiredService<IOptions<PeriodicExportingMetricReaderOptions>>().Value;

        Assert.Equal(intervalToUse, options.ExportIntervalMilliseconds);
        Assert.Equal(timeoutToUse, options.ExportTimeoutMilliseconds);
    }

    private Sampler GetSampler(TracerProvider provider)
    {
        var property =
            provider.GetType().GetProperty("Sampler", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Sampler internal property not found on TraceProvider");

        return (property.GetValue(provider) as Sampler) ?? throw new InvalidOperationException("Sampler not found");
    }
}
