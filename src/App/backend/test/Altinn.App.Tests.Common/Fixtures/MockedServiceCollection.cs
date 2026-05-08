using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Layout.Components.Base;
using Altinn.App.Tests.Common.Mocks;
using Altinn.App.Tests.Common.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using Xunit.Abstractions;

namespace Altinn.App.Tests.Common.Fixtures;

public sealed class MockedServiceCollection
{
    public const string Org = "ttd";
    public const string App = "mocked-app";

    public PlatformSettings PlatformSettings { get; } = new PlatformSettings();
    public AppSettings AppSettings { get; } = new AppSettings();
    public GeneralSettings GeneralSettings { get; } = new GeneralSettings();

    public ApplicationMetadata AppMetadata => Storage.AppMetadata;

    public StorageClientInterceptor Storage { get; }

    public FakeHttpMessageHandler FakeHttpMessageHandler { get; } = new FakeHttpMessageHandler();

    public List<Activity> Traces { get; } = new();

    public List<Metric> Metrics { get; } = new();

    public List<LogRecord> Logs { get; } = new();

    public ITestOutputHelper? OutputHelper { get; set; }

    public readonly IServiceCollection Services = new ServiceCollection();

    public MockedServiceCollection()
    {
        Storage = new StorageClientInterceptor(new($"{Org}/{App}"));
        Services.AddSingleton(this);
        Services.AddSingleton(Storage);
        Services.AddSingleton(FakeHttpMessageHandler);
    }

    private void TryAddCommonServices()
    {
        Services.ConfigureHttpClientDefaults(builder =>
        {
            builder.ConfigurePrimaryHttpMessageHandler(() => FakeHttpMessageHandler);
        });
        Services.AddAppImplementationFactory();

        // Adding options
        Services.TryAddSingleton(Options.Create(PlatformSettings));
        Services.TryAddSingleton(Options.Create(AppSettings));
        Services.TryAddSingleton(Options.Create(GeneralSettings));

        Services.TryAddSingleton(new AppIdentifier(Org, App));

        // Adding Validation infrastructure
        Services.TryAddSingleton<IValidationService, ValidationService>();
        Services.TryAddSingleton<IValidatorFactory, ValidatorFactory>();

        // Adding Translation infrastructure
        Services.TryAddSingleton<ITranslationService, TranslationService>();

        // InstanceDataUnitOfWork
        Services.TryAddSingleton<InstanceDataUnitOfWorkInitializer>();
        Services.TryAddSingleton<ModelSerializationService>();

        // Adding Data infrastructure
        Services.AddSingleton(Storage);
        // There is no TryAddHttpClient, but these are the core of the mocked service collection
        Services.AddHttpClient<IDataClient, DataClient>().ConfigurePrimaryHttpMessageHandler(() => Storage);
        Services.AddHttpClient<IInstanceClient, InstanceClient>().ConfigurePrimaryHttpMessageHandler(() => Storage);
        Services.TryAddTransient<IDataService, DataService>();

        // Adding Telemetry and logging infrastructure
        Services.TryAddSingleton<Telemetry>();

        // Add standard mocks

        // Setup default mock behaviours
        Mock<IAppMetadata>().Setup(a => a.GetApplicationMetadata()).ReturnsAsync(AppMetadata);
        Mock<IAuthenticationTokenResolver>()
            .Setup(a => a.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new JwtToken());
        Mock<IUserTokenProvider>().Setup(utp => utp.GetUserToken()).Returns("[userToken]");
        // Setup AppResources to return text resources from the internal dictionary
        Mock<IAppResources>()
            .Setup(a => a.GetTexts(Org, App, It.IsAny<string>()))
            .ReturnsAsync(
                (string _, string _, string language) =>
                {
                    lock (_textResources)
                    {
                        return _textResources.GetValueOrDefault(language);
                    }
                }
            );
        Mock<IAppResources>()
            .Setup(a => a.GetLayoutModelForFolder(It.IsAny<string>()))
            .Returns(
                (string taskid) =>
                {
                    var layouts = _uiFolderComponents.ToList();
                    return new LayoutModel(layouts, taskid);
                }
            );
        // Just ensure that there exists a mock for IAppModel
        Mock<IAppModel>();
    }

    private readonly Dictionary<Type, Mock> _mocks = [];

    /// <summary>
    /// Get or create a strict mock of the specified type and register it as a singleton service.
    /// </summary>
    /// <typeparam name="T">The interface to mock</typeparam>
    /// <returns>A Mock of the specified interface ready for setup</returns>
    public Mock<T> Mock<T>()
        where T : class
    {
        lock (_mocks)
        {
            var type = typeof(T);
            if (_mocks.TryGetValue(type, out var existingMock))
            {
                return (Mock<T>)existingMock;
            }
            var mock = new Mock<T>(MockBehavior.Strict);
            _mocks[type] = mock;
            Services.TryAddSingleton(mock.Object);
            return mock;
        }
    }

    public void AddDataType(DataType dataType)
    {
        lock (AppMetadata.DataTypes)
        {
            AppMetadata.DataTypes.Add(dataType);
        }
    }

    public DataType AddDataType<T>(
        string? dataTypeId = null,
        string[]? allowedContentTypes = null,
        int maxCount = 1,
        string? taskId = null
    )
        where T : class, new()
    {
        var classRef =
            typeof(T).FullName
            ?? throw new InvalidOperationException("DataType for formData does not have a ClassRef defined.");
        var dataType = new DataType()
        {
            Id = dataTypeId ?? typeof(T).Name.ToLowerInvariant(),
            AppLogic = new() { ClassRef = classRef },
            MaxCount = maxCount,
            AllowedContentTypes = allowedContentTypes?.ToList() ?? ["application/xml"],
            TaskId = taskId ?? "Task_1",
        };

        Mock<IAppModel>().Setup(a => a.GetModelType(classRef)).Returns(typeof(T));
        Mock<IAppModel>().Setup(a => a.Create(classRef)).Returns(() => new T());

        AddDataType(dataType);
        return dataType;
    }

    private readonly Dictionary<string, TextResource> _textResources = new();

    public void AddTextResource(string language, TextResourceElement textResource)
    {
        lock (_textResources)
        {
            _textResources.TryAdd(
                language,
                new()
                {
                    Id = $"{Org}-{App}-{language}",
                    Org = Org,
                    Language = language,
                    Resources = [],
                }
            );
            _textResources[language].Resources.Add(textResource);
        }
    }

    private readonly ConcurrentBag<UiFolderComponent> _uiFolderComponents = new();

    /// <summary>
    /// Add single page layout set from JSON definition
    /// </summary>
    public void AddLayoutSet(DataType dataType, [StringSyntax("json")] string pageJson)
    {
        using var document = JsonDocument.Parse(pageJson);
        var page = PageComponent.Parse(document.RootElement, "page1", dataType.TaskId);
        AddLayoutSet(dataType, [page]);
    }

    public void AddLayoutSet(DataType dataType, IEnumerable<PageComponent> pages)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(dataType.TaskId);
        ArgumentException.ThrowIfNullOrWhiteSpace(dataType.Id);

        // All pages will likely have the same LayoutId, but group by to be sure
        foreach (var grouping in pages.GroupBy(p => p.LayoutId))
        {
            var layoutSet = new LayoutSet
            {
                Id = grouping.Key,
                DataType = dataType.Id,
                Tasks = [dataType.TaskId],
            };

            var layoutComponent = new UiFolderComponent(
                pages: grouping.ToList(),
                id: layoutSet.Id,
                defaultDataType: dataType
            );

            _uiFolderComponents.Add(layoutComponent);
        }
    }

    public WrappedServiceProvider BuildServiceProvider()
    {
        TryAddCommonServices();
        return new WrappedServiceProvider(this);
    }

    public void VerifyMocks()
    {
        lock (_mocks)
        {
            foreach (var mock in _mocks.Values)
            {
                mock.Verify();
            }
        }
        FakeHttpMessageHandler.Verify();
    }
}

public sealed class WrappedServiceProvider : IKeyedServiceProvider, IDisposable, IAsyncDisposable
{
    public List<Activity> Traces => _serviceCollection.Traces;
    public List<Metric> Metrics => _serviceCollection.Metrics;
    public List<LogRecord> Logs => _serviceCollection.Logs;

    private readonly TracerProvider _tracerProvider;
    private readonly MeterProvider _meterProvider;
    private readonly ServiceProvider _serviceProvider;
    private readonly LoggerProvider _loggerProvider;
    private readonly MockedServiceCollection _serviceCollection;

    public WrappedServiceProvider(MockedServiceCollection serviceCollection)
    {
        serviceCollection.Services.AddLogging(builder =>
        {
            builder.AddOpenTelemetry(options =>
            {
                options.AddInMemoryExporter(Logs);
                options.IncludeFormattedMessage = true;
                options.IncludeScopes = true;
            });
        });
        _serviceProvider = serviceCollection.Services.BuildServiceProvider();
        _serviceCollection = serviceCollection;
        var telemetry = _serviceProvider.GetRequiredService<Telemetry>();
        _tracerProvider = Sdk.CreateTracerProviderBuilder()
            .AddSource(telemetry.ActivitySource.Name)
            .AddSource(FakeHttpMessageHandler.ActivitySource.Name)
            .AddInMemoryExporter(Traces)
            .Build();
        _meterProvider = Sdk.CreateMeterProviderBuilder()
            .AddMeter(telemetry.ActivitySource.Name)
            .AddInMemoryExporter(Metrics)
            .Build();
        _loggerProvider = _serviceProvider.GetRequiredService<LoggerProvider>();
    }

    public void DumpTracesAndMetrics()
    {
        if (_serviceCollection.OutputHelper is not { } outputHelper)
        {
            return;
        }
        _tracerProvider.ForceFlush();
        _meterProvider.ForceFlush();
        _loggerProvider.ForceFlush();

        outputHelper.WriteLine("");
        outputHelper.WriteLine("OTEL Data:");
        outputHelper.WriteLine($"Traces collected: {Traces.Count}");
        outputHelper.WriteLine($"Logs collected: {Logs.Count}");
        outputHelper.WriteLine(
            OtelVisualizers.VisualizeActivities(Traces, Logs, includeDuration: true, initialIndent: 1)
        );
        outputHelper.WriteLine("");
        outputHelper.WriteLine($"Meters collected: {Metrics.Count}");
        foreach (var metric in Metrics)
        {
            // Figure out a better way to dump metric data later
            outputHelper.WriteLine($"{metric.Name} - {metric.Temporality} - {metric.Unit}");
        }
    }

    internal async Task<InstanceDataUnitOfWork> CreateInstanceDataUnitOfWork<T>(
        T model,
        DataType dataType,
        string? language
    )
        where T : class, new()
    {
        var serializer = _serviceProvider.GetRequiredService<ModelSerializationService>();
        var instanceGuid = Guid.NewGuid();
        var dataGuid = Guid.NewGuid();
        var partyId = 123456;
        var data = new DataElement()
        {
            Id = dataGuid.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = dataType.Id,
            ContentType = dataType.AllowedContentTypes?.FirstOrDefault() ?? "application/xml",
        };
        var instance = new Instance()
        {
            Id = $"{partyId}/{instanceGuid}",
            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
            InstanceOwner = new InstanceOwner() { PartyId = partyId.ToString() },
            Data = [data],
            Process = new() { CurrentTask = new() { ElementId = dataType.TaskId } },
        };

        _serviceCollection.Storage.AddInstance(instance);
        _serviceCollection.Storage.AddDataRaw(
            dataGuid,
            serializer.SerializeToStorage(model, dataType, data).data.ToArray()
        );

        var instanceCopy = JsonSerializer.Deserialize<Instance>(JsonSerializer.SerializeToUtf8Bytes(instance))!;

        var initializer = _serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        return await initializer.Init(instanceCopy, dataType.TaskId, language);
    }

    internal async Task<InstanceDataUnitOfWork> CreateInstanceDataMutatorWithDataAndLayout<T>(
        T model,
        List<BaseLayoutComponent> components,
        string? language
    )
        where T : class, new()
    {
        DataType defaultDataType = _serviceCollection.AddDataType<T>();
        var layoutSetName = defaultDataType.TaskId!;
        var pages = components
            .GroupBy(c => c.PageId)
            .Select(group =>
            {
                var componentList = group.ToList();
                var pageComponentLookup = componentList.ToDictionary(c => c.Id, StringComparer.Ordinal);
                Dictionary<string, string> claimedComponentIds = [];
                foreach (var component in componentList)
                {
                    component.ClaimChildren(pageComponentLookup, claimedComponentIds);
                }
                var childComponents = componentList.Where(c => !claimedComponentIds.ContainsKey(c.Id)).ToList();
                return new PageComponent
                {
                    Id = group.Key,
                    PageId = group.Key,
                    LayoutId = layoutSetName,
                    Type = "page",
                    ChildComponents = childComponents,
                    AllComponents = componentList,
                    Hidden = default,
                    RemoveWhenHidden = default,
                    Required = default,
                    ReadOnly = default,
                    DataModelBindings = ImmutableDictionary<string, ModelBinding>.Empty,
                    TextResourceBindings = ImmutableDictionary<string, Expression>.Empty,
                };
            });

        _serviceCollection.AddLayoutSet(defaultDataType, pages);

        return await CreateInstanceDataUnitOfWork(model, defaultDataType, language);
    }

    #region ServiceProvider interface implementation
    public object? GetService(Type serviceType)
    {
        return _serviceProvider.GetService(serviceType);
    }

    public object? GetKeyedService(Type serviceType, object? serviceKey)
    {
        return _serviceProvider.GetKeyedService(serviceType, serviceKey);
    }

    public object GetRequiredKeyedService(Type serviceType, object? serviceKey)
    {
        return _serviceProvider.GetRequiredKeyedService(serviceType, serviceKey);
    }

    private bool _dumpedTracesAndMetrics;

    public void Dispose()
    {
        _serviceProvider.Dispose();
        if (!_dumpedTracesAndMetrics)
        {
            _dumpedTracesAndMetrics = true;
            DumpTracesAndMetrics();
        }
        _loggerProvider.Dispose();
        _tracerProvider.Dispose();
        _meterProvider.Dispose();
    }

    public async ValueTask DisposeAsync()
    {
        await _serviceProvider.DisposeAsync();
        if (!_dumpedTracesAndMetrics)
        {
            _dumpedTracesAndMetrics = true;
            DumpTracesAndMetrics();
        }
        _loggerProvider.Dispose();
        _tracerProvider.Dispose();
        _meterProvider.Dispose();
    }
    #endregion
}
