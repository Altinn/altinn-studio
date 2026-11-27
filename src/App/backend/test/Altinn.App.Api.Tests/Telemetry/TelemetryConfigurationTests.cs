using System.Diagnostics;
using System.Reflection;
using Altinn.App.Api.Helpers;
using Altinn.App.Api.Infrastructure.Telemetry;
using Altinn.App.Core.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using AppServices = Altinn.App.Api.Extensions.ServiceCollectionExtensions;

namespace Altinn.App.Api.Tests;

public class TelemetryConfigurationTests
{
    // An endpoint nothing listens on: these tests look at how the SDK is set up, not at what reaches a collector.
    private const string UnusedOtlpEndpoint = "http://127.0.0.1:9";

    private static List<KeyValuePair<string, string?>> Exporting(params KeyValuePair<string, string?>[] more) =>
        [new("GeneralSettings:IsTest", "false"), new(AppServices.OtlpEndpointVariable, UnusedOtlpEndpoint), .. more];

    [Fact]
    public async Task OpenTelemetry_Is_Registered_Without_Configuration()
    {
        Telemetry? telemetry = null;
        await using (var app = AppBuilder.Build())
        {
            telemetry = app.Services.GetService<Telemetry>();
            Assert.NotNull(telemetry);
            Assert.True(telemetry.IsInitialized);
            Assert.False(telemetry.IsDisposed);
            Assert.NotNull(app.Services.GetService<TracerProvider>());
            Assert.NotNull(app.Services.GetService<MeterProvider>());
            Assert.NotNull(app.Services.GetService<LoggerProvider>());
        }
        Assert.True(telemetry.IsDisposed);
    }

    [Fact]
    public async Task Without_An_Endpoint_Nothing_Is_Exported()
    {
        await using var app = AppBuilder.Build(configData: [new("GeneralSettings:IsTest", "false")]);

        Assert.Empty(ExportProcessors(app.Services.GetRequiredService<TracerProvider>()));
        Assert.Empty(PeriodicReaders(app.Services.GetRequiredService<MeterProvider>()));
        Assert.Empty(LogExportProcessors(app.Services.GetRequiredService<LoggerProvider>()));
    }

    [Fact]
    public async Task With_An_Endpoint_Every_Signal_Is_Exported_Over_Otlp()
    {
        await using var app = AppBuilder.Build(configData: Exporting());

        Assert.Contains(
            ExportProcessors(app.Services.GetRequiredService<TracerProvider>()),
            exporter => exporter.GetType().Name == "OtlpTraceExporter"
        );
        Assert.Single(PeriodicReaders(app.Services.GetRequiredService<MeterProvider>()));
        Assert.Contains(
            LogExportProcessors(app.Services.GetRequiredService<LoggerProvider>()),
            exporter => exporter.GetType().Name == "OtlpLogExporter"
        );
    }

    [Fact]
    public async Task Metric_Export_Interval_Comes_From_OTEL_METRIC_EXPORT_INTERVAL()
    {
        await using var app = AppBuilder.Build(
            configData: Exporting(
                new("OTEL_METRIC_EXPORT_INTERVAL", "15000"),
                new("OTEL_METRIC_EXPORT_TIMEOUT", "7000")
            )
        );

        var reader = Assert.Single(PeriodicReaders(app.Services.GetRequiredService<MeterProvider>()));
        Assert.Equal(15_000, ReadIntField(reader, "ExportIntervalMilliseconds"));
        Assert.Equal(7_000, ReadIntField(reader, "ExportTimeoutMilliseconds"));
    }

    [Fact]
    public async Task Libraries_Set_No_Otel_Variables_In_Development()
    {
        await using var app = AppBuilder.Build(configData: Exporting());

        var config = app.Services.GetRequiredService<IConfiguration>();
        Assert.DoesNotContain(
            config.AsEnumerable(),
            kvp =>
                kvp.Key.StartsWith("OTEL_", StringComparison.OrdinalIgnoreCase)
                && kvp.Key != AppServices.OtlpEndpointVariable
        );

        // The SDK's default interval when the deployment sets none.
        var reader = Assert.Single(PeriodicReaders(app.Services.GetRequiredService<MeterProvider>()));
        Assert.Equal(60_000, ReadIntField(reader, "ExportIntervalMilliseconds"));
    }

    [Fact]
    public async Task Every_Trace_Is_Kept_Whatever_OTEL_TRACES_SAMPLER_Says()
    {
        await using var app = AppBuilder.Build(
            configData: Exporting(new("OTEL_TRACES_SAMPLER", "traceidratio"), new("OTEL_TRACES_SAMPLER_ARG", "0.1"))
        );

        Assert.IsType<AlwaysOnSampler>(GetSampler(app.Services.GetRequiredService<TracerProvider>()));
    }

    [Fact]
    public async Task Resource_Has_The_Apps_Attributes_And_Keeps_What_The_Deployment_Sets()
    {
        await using var app = AppBuilder.Build(
            configData:
            [
                new("OTEL_RESOURCE_ATTRIBUTES", "k8s.pod.uid=0b6e1f5c-1111-2222-3333-444455556666,service.version=v42"),
            ]
        );

        var resource = Attributes(app.Services.GetRequiredService<TracerProvider>().GetResource());
        var appId = StartupHelper.GetApplicationId(app.Environment.ContentRootPath).Split('/');

        Assert.Equal("0b6e1f5c-1111-2222-3333-444455556666", resource["k8s.pod.uid"]);
        Assert.Equal("v42", resource["service.version"]);
        Assert.Equal(appId[1], resource["service.name"]);
        Assert.False(resource.ContainsKey("service.namespace"));
        Assert.Equal(appId[0], resource["altinn.service_owner"]);
        Assert.Equal(appId[1], resource["altinn.app"]);
        Assert.Equal(AppTelemetryResource.LibraryVersion, resource["altinn.app_lib.version"]);
        Assert.StartsWith("9.", AppTelemetryResource.LibraryVersion, StringComparison.Ordinal);
        Assert.DoesNotContain('+', AppTelemetryResource.LibraryVersion);
        Assert.True(Guid.TryParse(resource["service.instance.id"], out _));

        // The same resource on every signal.
        Assert.Equal(resource, Attributes(app.Services.GetRequiredService<MeterProvider>().GetResource()));
        Assert.Equal(resource, Attributes(app.Services.GetRequiredService<LoggerProvider>().GetResource()));
    }

    [Fact]
    public async Task OTEL_SERVICE_NAME_Wins_Over_The_Apps_Name()
    {
        await using var app = AppBuilder.Build(configData: [new("OTEL_SERVICE_NAME", "from-the-deployment")]);

        var resource = Attributes(app.Services.GetRequiredService<TracerProvider>().GetResource());

        Assert.Equal("from-the-deployment", resource["service.name"]);
    }

    [Fact]
    public async Task Information_Logs_Reach_The_Exporter()
    {
        List<LogRecord> exported = [];
        await using var app = AppBuilder.Build(registerCustomAppServices: services =>
            services.ConfigureOpenTelemetryLoggerProvider(builder => builder.AddInMemoryExporter(exported))
        );
        var logger = app.Services.GetRequiredService<ILogger<TelemetryConfigurationTests>>();

        logger.LogInformation("An information record");
        logger.LogDebug("A debug record");
        app.Services.GetRequiredService<LoggerProvider>().ForceFlush();

        Assert.Contains(exported, record => record.LogLevel == LogLevel.Information);
    }

    [Fact]
    public async Task Process_Start_Time_Is_Reported()
    {
        List<Metric> metrics = [];
        await using var app = AppBuilder.Build(registerCustomAppServices: services =>
            services.ConfigureOpenTelemetryMeterProvider(b => b.AddInMemoryExporter(metrics))
        );

        app.Services.GetRequiredService<MeterProvider>().ForceFlush();

        var startTime = Assert.Single(metrics, metric => metric.Name == "altinn.workload.start_time");
        Assert.Equal("s", startTime.Unit);
    }

    [Fact]
    public async Task A_Sampler_Set_In_RegisterCustomAppServices_Does_Not_Drop_Traces()
    {
        await using var app = AppBuilder.Build(registerCustomAppServices: services =>
        {
            services.ConfigureOpenTelemetryTracerProvider(builder =>
            {
                builder.SetSampler(new TraceIdRatioBasedSampler(0.1));
            });
        });

        Assert.IsType<AlwaysOnSampler>(GetSampler(app.Services.GetRequiredService<TracerProvider>()));
    }

    private static Dictionary<string, string> Attributes(Resource resource) =>
        resource.Attributes.ToDictionary(a => a.Key, a => Convert.ToString(a.Value) ?? "");

    private static Sampler GetSampler(TracerProvider provider)
    {
        var property =
            provider.GetType().GetProperty("Sampler", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Sampler internal property not found on TraceProvider");

        return (property.GetValue(provider) as Sampler) ?? throw new InvalidOperationException("Sampler not found");
    }

    // The SDK keeps its processors and readers internal, so the tests find the exporters by reflection.

    private static List<object> ExportProcessors(TracerProvider provider) =>
        Exporters(ReadProperty(provider, "Processor"));

    private static List<object> LogExportProcessors(LoggerProvider provider) =>
        Exporters(ReadProperty(provider, "Processor"));

    private static List<MetricReader> PeriodicReaders(MeterProvider provider)
    {
        List<MetricReader> readers = [];
        Collect(ReadProperty(provider, "Reader"));
        return readers;

        void Collect(object? reader)
        {
            switch (reader)
            {
                case null:
                    return;
                case PeriodicExportingMetricReader periodic:
                    // The in-memory exporters some tests add are periodic too; only the OTLP exporter counts.
                    if (ReadField(periodic, "exporter")?.GetType().Name == "OtlpMetricExporter")
                        readers.Add(periodic);
                    return;
                default:
                    foreach (var inner in Children(reader))
                        Collect(inner);
                    return;
            }
        }
    }

    private static List<object> Exporters(object? processor)
    {
        List<object> exporters = [];
        Collect(processor);
        return exporters;

        void Collect(object? current)
        {
            if (current is null)
                return;
            if (ReadField(current, "exporter") is { } exporter)
            {
                exporters.Add(exporter);
                return;
            }
            foreach (var inner in Children(current))
                Collect(inner);
        }
    }

    // CompositeProcessor and CompositeMetricReader keep their children in a linked list.
    private static IEnumerable<object> Children(object composite)
    {
        var node = ReadField(composite, "Head") ?? ReadField(composite, "head");
        while (node is not null)
        {
            if (ReadField(node, "Value") is { } value)
                yield return value;
            node = ReadField(node, "Next");
        }
    }

    private static object? ReadProperty(object target, string name) =>
        target
            .GetType()
            .GetProperty(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            ?.GetValue(target);

    private static object? ReadField(object target, string name)
    {
        for (var type = target.GetType(); type is not null; type = type.BaseType)
        {
            var field = type.GetField(
                name,
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.IgnoreCase
            );
            if (field is not null)
                return field.GetValue(target);
            var property = type.GetProperty(
                name,
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.IgnoreCase
            );
            if (property is not null && property.GetIndexParameters().Length == 0)
                return property.GetValue(target);
        }
        return null;
    }

    private static int ReadIntField(object target, string name) =>
        ReadField(target, name) is int value
            ? value
            : throw new InvalidOperationException($"{target.GetType().Name} has no int {name}");
}
