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

public class MockedServiceCollection
{
    public const string Org = "ttd";
    public const string App = "mocked-app";

    public PlatformSettings PlatformSettings { get; } = new PlatformSettings();
    public AppSettings AppSettings { get; } = new AppSettings();
    public GeneralSettings GeneralSettings { get; } = new GeneralSettings();

    public ApplicationMetadata AppMetadata => Storage.AppMetadata;

    public StorageClientInterceptor Storage { get; }

    public List<Activity> Traces { get; } = new();

    public List<Metric> Metrics { get; } = new();

    public List<LogRecord> Logs { get; } = new();

    public ITestOutputHelper? OutputHelper { get; set; }

    public Mock<IAppResources> AppResourcesMock { get; } = new(MockBehavior.Strict);
    public Mock<IAppMetadata> AppMetadataMock { get; } = new(MockBehavior.Strict);
    public Mock<IAppModel> AppModelMock { get; } = new(MockBehavior.Strict);

    internal Mock<IAuthenticationTokenResolver> AuthenticationTokenResolverMock { get; } = new(MockBehavior.Strict);

    public Mock<IUserTokenProvider> UserTokenProviderMock { get; } = new(MockBehavior.Strict);

    private readonly IServiceCollection _services = new ServiceCollection();

    public MockedServiceCollection()
    {
        Storage = new StorageClientInterceptor();
        _services.AddSingleton(this);
    }

    public void TryAddCommonServices()
    {
        _services.AddAppImplementationFactory();

        // Adding options
        _services.TryAddSingleton(Options.Create(PlatformSettings));
        _services.TryAddSingleton(Options.Create(AppSettings));
        _services.TryAddSingleton(Options.Create(GeneralSettings));

        _services.TryAddSingleton(new AppIdentifier(Org, App));

        // Adding Validation infrastructure
        _services.TryAddSingleton<IValidationService, ValidationService>();
        _services.TryAddSingleton<IValidatorFactory, ValidatorFactory>();

        // Adding Translation infrastructure
        _services.TryAddSingleton<ITranslationService, TranslationService>();

        // InstanceDataUnitOfWork
        _services.TryAddSingleton<InstanceDataUnitOfWorkInitializer>();
        _services.TryAddSingleton<ModelSerializationService>();

        // There is no TryAddHttpClient, but these are the core of the mocked service collection
        _services.AddHttpClient<IDataClient, DataClient>().ConfigurePrimaryHttpMessageHandler(() => Storage);
        _services.AddHttpClient<IInstanceClient, InstanceClient>().ConfigurePrimaryHttpMessageHandler(() => Storage);

        _services.TryAddSingleton<Telemetry>();
        _services.AddLogging(builder =>
        {
            builder.AddOpenTelemetry(options =>
            {
                options.AddInMemoryExporter(Logs);
                options.IncludeFormattedMessage = true;
                options.IncludeScopes = true;
            });
        });

        // Add standard mocks
        _services.TryAddSingleton(AppResourcesMock.Object);
        _services.TryAddSingleton(AppMetadataMock.Object);
        _services.TryAddSingleton(AppModelMock.Object);
        _services.TryAddSingleton(AuthenticationTokenResolverMock.Object);
        _services.TryAddSingleton(UserTokenProviderMock.Object);

        // Setup default mock behaviours
        AppMetadataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(AppMetadata);
        AuthenticationTokenResolverMock
            .Setup(a => a.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new JwtToken());
        UserTokenProviderMock.Setup(utp => utp.GetUserToken()).Returns("[userToken]");
        // Setup AppResources to return text resources from the internal dictionary
        AppResourcesMock
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
        AppResourcesMock
            .Setup(a => a.GetLayoutModelForTask(It.IsAny<string>()))
            .Returns(
                (string taskid) =>
                {
                    var layouts = _layoutSetComponents.ToList();
                    var layoutForTask =
                        layouts.Find(lsc => lsc.DefaultDataType.TaskId == taskid)
                        ?? throw new Exception($"Layout for task {taskid} not found.");
                    return new LayoutModel(
                        layouts,
                        new LayoutSet()
                        {
                            DataType = layoutForTask.DefaultDataType.Id,
                            Id = layoutForTask.Id,
                            Tasks = [taskid],
                        }
                    );
                }
            );
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

        AppModelMock.Setup(a => a.GetModelType(classRef)).Returns(typeof(T));
        AppModelMock.Setup(a => a.Create(classRef)).Returns(() => new T());

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

    private readonly ConcurrentBag<LayoutSetComponent> _layoutSetComponents = new();

    /// <summary>
    /// Add single page layout set from JSON definition
    /// </summary>
    public void AddLayoutSet(DataType dataType, [StringSyntax("json")] string pageJson)
    {
        var layoutId = $"layoutSet-{dataType.TaskId}";
        using var document = JsonDocument.Parse(pageJson);
        var page = PageComponent.Parse(document.RootElement, "page1", layoutId);
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

            var layoutComponent = new LayoutSetComponent(
                pages: grouping.ToList(),
                id: layoutSet.Id,
                defaultDataType: dataType
            );

            _layoutSetComponents.Add(layoutComponent);
        }
    }

    public WrappedServiceProvider BuildServiceProvider() => new(this, _services.BuildServiceProvider());

    public void VerifyMocks()
    {
        AppMetadataMock.Verify();
        AppModelMock.Verify();
        AuthenticationTokenResolverMock.Verify();
        AppResourcesMock.Verify();
    }
}

public class WrappedServiceProvider : IKeyedServiceProvider, IDisposable, IAsyncDisposable
{
    public List<Activity> Traces => _serviceCollection.Traces;
    public List<Metric> Metrics => _serviceCollection.Metrics;
    public List<LogRecord> Logs => _serviceCollection.Logs;

    private readonly TracerProvider _tracerProvider;
    private readonly MeterProvider _meterProvider;
    private readonly ServiceProvider _serviceProvider;
    private readonly MockedServiceCollection _serviceCollection;

    public WrappedServiceProvider(MockedServiceCollection serviceCollection, ServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _serviceCollection = serviceCollection;
        var telemetry = serviceProvider.GetRequiredService<Telemetry>();
        _tracerProvider = Sdk.CreateTracerProviderBuilder()
            .AddSource(telemetry.ActivitySource.Name)
            .AddInMemoryExporter(Traces)
            .Build();
        _meterProvider = Sdk.CreateMeterProviderBuilder()
            .AddMeter(telemetry.ActivitySource.Name)
            .AddInMemoryExporter(Metrics)
            .Build();
    }

    public void DumpTracesAndMetrics()
    {
        if (_serviceCollection.OutputHelper is not { } outputHelper)
        {
            return;
        }
        _tracerProvider.ForceFlush();
        _meterProvider.ForceFlush();

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
        List<BaseComponent> components,
        string? language
    )
        where T : class, new()
    {
        var layoutSetName = "layoutSet1";
        var pages = components
            .GroupBy(c => c.PageId)
            .Select(group => new PageComponent
            {
                Id = group.Key,
                PageId = group.Key,
                LayoutId = layoutSetName,
                Type = "page",
                Components = group.ToList(),
                Hidden = default,
                RemoveWhenHidden = default,
                Required = default,
                ReadOnly = default,
                DataModelBindings = ImmutableDictionary<string, ModelBinding>.Empty,
                TextResourceBindings = ImmutableDictionary<string, Expression>.Empty,
            });

        DataType defaultDataType = _serviceCollection.AddDataType<T>();
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

#pragma warning disable CA1816
    public void Dispose()
    {
        if (!_dumpedTracesAndMetrics)
        {
            _dumpedTracesAndMetrics = true;
            DumpTracesAndMetrics();
        }
        _serviceProvider.Dispose();
        _tracerProvider.Dispose();
        _meterProvider.Dispose();
    }

    public async ValueTask DisposeAsync()
    {
        if (!_dumpedTracesAndMetrics)
        {
            _dumpedTracesAndMetrics = true;
            DumpTracesAndMetrics();
        }
        await _serviceProvider.DisposeAsync();
        _tracerProvider.Dispose();
        _meterProvider.Dispose();
    }
#pragma warning restore CA1816
    #endregion
}
