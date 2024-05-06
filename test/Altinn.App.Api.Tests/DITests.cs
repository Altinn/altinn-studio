using System.Diagnostics.Tracing;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Xunit;

namespace Altinn.App.Api.Tests;

public class DITests
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
            .AddInMemoryCollection(
                [new KeyValuePair<string, string?>("ApplicationInsights:InstrumentationKey", "test")]
            )
            .Build();

        Extensions.ServiceCollectionExtensions.AddAltinnAppServices(services, config, env);
        services.AddApplicationInsightsTelemetryProcessor<TelemetryProcessor>();

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
        Assert.Empty(events.Where(e => errorLevels.Contains(e.Level)));

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
    public async Task KeyedServices_Produces_Error_Diagnostics()
    {
        // This test just verifies that we rootcaused the issues re: https://github.com/Altinn/app-lib-dotnet/pull/594

        using var listener = new AppInsightsListener();

        var services = new ServiceCollection();
        var env = new FakeWebHostEnvironment { EnvironmentName = "Development" };

        services.AddSingleton<IWebHostEnvironment>(env);
        services.AddSingleton<IHostingEnvironment>(env);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(
                [new KeyValuePair<string, string?>("ApplicationInsights:InstrumentationKey", "test")]
            )
            .Build();

        // AppInsights SDK currently can't handle keyed services in the container
        // Hopefully we can remove all this soon
        services.AddKeyedSingleton<ITelemetryProcessor, TelemetryProcessor>("test");

        Extensions.ServiceCollectionExtensions.AddAltinnAppServices(services, config, env);

        await using (var sp = services.BuildServiceProvider())
        {
            var client = sp.GetService<TelemetryClient>();
            Assert.Null(client);
        }

        await Task.Yield();

        EventLevel[] errorLevels = [EventLevel.Error, EventLevel.Critical];
        var events = listener.Events;
        Assert.NotEmpty(events.Where(e => errorLevels.Contains(e.Level)));
    }
}
