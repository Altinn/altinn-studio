using System.Diagnostics.Tracing;
using System.Reflection;
using Altinn.App.Core.Features;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.AspNetCore.Extensions;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace Altinn.App.Api.Tests;

public class TelemetryConfigurationTests
{
    private sealed record FakeWebHostEnvironment : IWebHostEnvironment, IHostingEnvironment
    {
        private string _env = "";

        public string WebRootPath
        {
            get => new DirectoryInfo("./").FullName;
            set => throw new NotImplementedException();
        }
        public IFileProvider WebRootFileProvider
        {
            get => throw new NotImplementedException();
            set => throw new NotImplementedException();
        }
        public string ApplicationName
        {
            get => "test";
            set => throw new NotImplementedException();
        }
        public IFileProvider ContentRootFileProvider
        {
            get => throw new NotImplementedException();
            set => throw new NotImplementedException();
        }
        public string ContentRootPath
        {
            get => new DirectoryInfo("./").FullName;
            set => throw new NotImplementedException();
        }
        public string EnvironmentName
        {
            get => _env;
            set => _env = value;
        }
    }

    private sealed class AppInsightsListener : EventListener
    {
        private readonly object _lock = new();
        private readonly List<EventSource> _eventSources = [];
        private readonly List<EventWrittenEventArgs> _events = [];

        public EventWrittenEventArgs[] Events
        {
            get
            {
                lock (_lock)
                {
                    return _events.ToArray();
                }
            }
        }

        protected override void OnEventSourceCreated(EventSource eventSource)
        {
            if (eventSource.Name == "Microsoft-ApplicationInsights-AspNetCore")
            {
                _eventSources.Add(eventSource);
                EnableEvents(eventSource, EventLevel.Verbose, EventKeywords.All);
            }

            base.OnEventSourceCreated(eventSource);
        }

        protected override void OnEventWritten(EventWrittenEventArgs eventData)
        {
            if (eventData.EventSource.Name != "Microsoft-ApplicationInsights-AspNetCore")
            {
                return;
            }

            lock (_lock)
            {
                _events.Add(eventData);
            }
            base.OnEventWritten(eventData);
        }

        public override void Dispose()
        {
            foreach (var eventSource in _eventSources)
            {
                DisableEvents(eventSource);
            }
            base.Dispose();
        }
    }

    private sealed class TelemetryProcessor(ITelemetryProcessor next) : ITelemetryProcessor
    {
        private static readonly object _lock = new();

        private static readonly List<ITelemetry> _items = new();

        public static ITelemetry[] Items
        {
            get
            {
                lock (_lock)
                {
                    return _items.ToArray();
                }
            }
        }

        public void Process(ITelemetry item)
        {
            lock (_lock)
            {
                _items.Add(item);
            }
            next.Process(item);
        }
    }

    [Fact]
    public async Task AppInsights_Registers_Correctly()
    {
        using var listener = new AppInsightsListener();

        var services = new ServiceCollection();
        var env = new FakeWebHostEnvironment { EnvironmentName = "Development" };

        services.AddSingleton<IWebHostEnvironment>(env);
        services.AddSingleton<IHostingEnvironment>(env);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection([
                new KeyValuePair<string, string?>("ApplicationInsights:InstrumentationKey", "test"),
            ])
            .Build();

        Altinn.App.Api.Extensions.ServiceCollectionExtensions.AddAltinnAppServices(services, config, env);
        services.AddApplicationInsightsTelemetryProcessor<TelemetryProcessor>();
        services.Configure<ApplicationInsightsServiceOptions>(options =>
            options.RequestCollectionOptions.InjectResponseHeaders = false
        );

        // Don't use BuildStrictServiceProvider here since we only want to test parts of the container that
        // `AddAltinnAppServices` brings in
        await using (var sp = services.BuildServiceProvider())
        {
            var telemetryConfig = sp.GetRequiredService<TelemetryConfiguration>();
            Assert.NotNull(telemetryConfig);

            var client = sp.GetRequiredService<TelemetryClient>();
            Assert.NotNull(client);

            client.TrackEvent("TestEvent");
            await client.FlushAsync(default);
        }

        await Task.Yield();

        EventLevel[] errorLevels = [EventLevel.Error, EventLevel.Critical];
        var events = listener.Events;
        Assert.DoesNotContain(events, e => errorLevels.Contains(e.Level));

        var telemetryItems = TelemetryProcessor.Items;
        var customEvents = telemetryItems
            .Select(e => e as EventTelemetry)
            .Where(e => e?.Name is not null)
            .Select(e => e?.Name)
            .ToArray();
        Assert.Single(customEvents);
        var customEvent = customEvents[0];
        Assert.Equal("TestEvent", customEvent);
    }

    [Fact]
    public async Task OpenTelemetry_Registers_Correctly_When_Enabled()
    {
        List<KeyValuePair<string, string?>> configData =
        [
            new("ApplicationInsights:InstrumentationKey", "test"),
            new("AppSettings:UseOpenTelemetry", "true"),
        ];
        Telemetry? telemetry = null;
        await using (var app = AppBuilder.Build(configData: configData))
        {
            var telemetryClient = app.Services.GetService<TelemetryClient>();
            Assert.Null(telemetryClient);

            telemetry = app.Services.GetService<Telemetry>();
            Assert.NotNull(telemetry);
            Assert.True(telemetry.IsInitialized);
            Assert.False(telemetry.IsDisposed);
        }
        Assert.True(telemetry.IsDisposed);
    }

    [Fact]
    public async Task OpenTelemetry_Does_Not_Register_By_Default()
    {
        List<KeyValuePair<string, string?>> configData = [new("ApplicationInsights:InstrumentationKey", "test")];
        await using (var app = AppBuilder.Build(configData: configData))
        {
            var telemetryClient = app.Services.GetService<TelemetryClient>();
            Assert.NotNull(telemetryClient);

            var telemetry = app.Services.GetService<Telemetry>();
            Assert.Null(telemetry);
        }
    }

    [Fact]
    public async Task OpenTelemetry_Development_Default_Sampler_Is_AlwaysOnSampler()
    {
        List<KeyValuePair<string, string?>> configData =
        [
            new("ApplicationInsights:InstrumentationKey", "test"),
            new("AppSettings:UseOpenTelemetry", "true"),
        ];
        await using var app = AppBuilder.Build(configData: configData);

        var traceProvider = app.Services.GetRequiredService<TracerProvider>();

        var sampler = GetSampler(traceProvider);
        Assert.IsType<AlwaysOnSampler>(sampler);
    }

    [Fact]
    public async Task OpenTelemetry_Development_Default_MetricReaderOptions()
    {
        List<KeyValuePair<string, string?>> configData =
        [
            new("ApplicationInsights:InstrumentationKey", "test"),
            new("AppSettings:UseOpenTelemetry", "true"),
        ];
        await using var app = AppBuilder.Build(configData: configData);

        var options = app.Services.GetRequiredService<IOptions<PeriodicExportingMetricReaderOptions>>().Value;

        Assert.Equal(10_000, options.ExportIntervalMilliseconds);
        Assert.Equal(8_000, options.ExportTimeoutMilliseconds);
    }

    [Fact]
    public async Task OpenTelemetry_Sampler_Override_Is_Possible()
    {
        List<KeyValuePair<string, string?>> configData =
        [
            new("ApplicationInsights:InstrumentationKey", "test"),
            new("AppSettings:UseOpenTelemetry", "true"),
        ];
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
        List<KeyValuePair<string, string?>> configData =
        [
            new("ApplicationInsights:InstrumentationKey", "test"),
            new("AppSettings:UseOpenTelemetry", "true"),
        ];

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
