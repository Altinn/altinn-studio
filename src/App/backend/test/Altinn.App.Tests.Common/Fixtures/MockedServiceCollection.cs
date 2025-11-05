using System.Collections.Immutable;
using System.Text;
using System.Text.Json;
using System.Xml;
using System.Xml.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Layout.Components.Base;
using Altinn.App.Tests.Common.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Tests.Common.Fixtures;

public class MockedServiceCollection
{
    public const string Org = "ttd";
    public const string App = "test";

    public PlatformSettings PlatformSettings { get; } = new PlatformSettings();
    public AppSettings AppSettings { get; } = new AppSettings();
    public GeneralSettings GeneralSettings { get; } = new GeneralSettings();

    public ApplicationMetadata AppMetadata { get; } =
        new($"{Org}/{App}")
        {
            Title = new() { [LanguageConst.Nb] = "Testapplikasjon", [LanguageConst.En] = "Test Application" },
            DataTypes = [],
        };

    public StorageClientInterceptor Storage { get; } = new();

    public Mock<IAppResources> AppResourcesMock { get; } = new(MockBehavior.Strict);
    public Mock<IAppMetadata> AppMetadataMock { get; } = new(MockBehavior.Strict);
    public Mock<IAppModel> AppModelMock { get; } = new(MockBehavior.Strict);

    internal Mock<IAuthenticationTokenResolver> AuthenticationTokenResolverMock { get; } = new(MockBehavior.Strict);

    public Mock<IUserTokenProvider> UserTokenProviderMock { get; } = new(MockBehavior.Strict);

    private readonly IServiceCollection _services = new ServiceCollection();

    public MockedServiceCollection()
    {
        _services.AddSingleton(this);
    }

    public void AddXunitLogging(ITestOutputHelper outputHelper)
    {
        FakeLoggerXunit.AddFakeLoggingWithXunit(_services, outputHelper);
    }

    public void TryAddCommonServices()
    {
        AppImplementationFactoryExtensions.AddAppImplementationFactory(_services);

        // Adding options
        ServiceCollectionDescriptorExtensions.TryAddSingleton(_services, Options.Create(PlatformSettings));
        ServiceCollectionDescriptorExtensions.TryAddSingleton(_services, Options.Create(AppSettings));
        ServiceCollectionDescriptorExtensions.TryAddSingleton(_services, Options.Create(GeneralSettings));

        ServiceCollectionDescriptorExtensions.TryAddSingleton(_services, new AppIdentifier(Org, App));

        // Adding Validation infrastructure
        ServiceCollectionDescriptorExtensions.TryAddSingleton<IValidationService, ValidationService>(_services);
        ServiceCollectionDescriptorExtensions.TryAddSingleton<IValidatorFactory, ValidatorFactory>(_services);

        // Adding Translation infrastructure
        ServiceCollectionDescriptorExtensions.TryAddSingleton<ITranslationService, TranslationService>(_services);

        // InstanceDataUnitOfWork
        ServiceCollectionDescriptorExtensions.TryAddSingleton<InstanceDataUnitOfWorkInitializer>(_services);
        ServiceCollectionDescriptorExtensions.TryAddSingleton<ModelSerializationService>(_services);

        // Just add the httpClients without a branch
        Storage.AddStorageClients(_services);

        // Ensure logging is present
        var hasLogger = Enumerable.Any<ServiceDescriptor>(_services, s => s.ServiceType == typeof(ILoggerFactory));
        if (!hasLogger)
        {
            ServiceCollectionServiceExtensions.AddSingleton<ILoggerFactory>(_services, NullLoggerFactory.Instance);
        }

        // Add standard mocks
        ServiceCollectionDescriptorExtensions.TryAddSingleton(_services, AppResourcesMock.Object);
        ServiceCollectionDescriptorExtensions.TryAddSingleton(_services, AppMetadataMock.Object);
        ServiceCollectionDescriptorExtensions.TryAddSingleton(_services, AppModelMock.Object);
        ServiceCollectionDescriptorExtensions.TryAddSingleton(_services, AuthenticationTokenResolverMock.Object);
        ServiceCollectionDescriptorExtensions.TryAddSingleton(_services, UserTokenProviderMock.Object);

        // Setup default mock behaviours
        AppMetadataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(AppMetadata);
        AuthenticationTokenResolverMock
            .Setup(a => a.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new JwtToken());
        UserTokenProviderMock.Setup(utp => utp.GetUserToken()).Returns("[userToken]");
        AppResourcesMock
            .Setup(a => a.GetTexts(Org, App, It.IsAny<String>()))
            .ReturnsAsync(
                (string _, string _, string language) =>
                {
                    lock (_textResources)
                    {
                        return _textResources.GetValueOrDefault(language);
                    }
                }
            );
    }

    private static byte[] SerializeXml<T>(T model)
        where T : class, new()
    {
        XmlWriterSettings xmlWriterSettings = new XmlWriterSettings()
        {
            Encoding = new UTF8Encoding(false),
            NewLineHandling = NewLineHandling.None,
        };
        using var memoryStream = new MemoryStream();
        using XmlWriter xmlWriter = XmlWriter.Create(memoryStream, xmlWriterSettings);

        XmlSerializer serializer = new XmlSerializer(model.GetType());
        serializer.Serialize(xmlWriter, model);
        return memoryStream.ToArray();
    }

    public void AddDataType(DataType dataType)
    {
        lock (AppMetadata.DataTypes)
        {
            AppMetadata.DataTypes.Add(dataType);
        }
    }

    public void AddDataType<T>(DataType dataType)
        where T : class, new()
    {
        var classRef =
            typeof(T).FullName
            ?? throw new InvalidOperationException("DataType for formData does not have a ClassRef defined.");

        dataType.AppLogic ??= new();
        dataType.AppLogic.ClassRef = classRef;

        AppModelMock.Setup(a => a.GetModelType(classRef)).Returns(typeof(T));
        AppModelMock.Setup(a => a.Create(classRef)).Returns(new T());

        AddDataType(dataType);
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

    public ServiceProvider BuildServiceProvider() =>
        ServiceCollectionContainerBuilderExtensions.BuildServiceProvider(_services);
}

public static class MockedServiceProviderExtensions
{
    internal static async Task<InstanceDataUnitOfWork> CreateInstanceDataMutatorWithDataAndLayout<T>(
        this ServiceProvider serviceProvider,
        T model,
        List<BaseComponent> components,
        string? language
    )
        where T : class, new()
    {
        var appServices = serviceProvider.GetRequiredService<MockedServiceCollection>();
        var instanceGuid = Guid.NewGuid();
        var dataGuid = Guid.NewGuid();
        var partyId = 123456;
        var dataTypeId = typeof(T).Name.ToLowerInvariant();
        var layoutSetName = "layoutSet1";
        var taskId = "Task_1";
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

        DataType defaultDataType = new()
        {
            Id = dataTypeId,
            MaxCount = 1,
            AllowedContentTypes = ["application/xml"],
        };

        appServices.AddDataType<T>(defaultDataType);

        var layoutModel = new LayoutModel(
            [new LayoutSetComponent(pages.ToList(), layoutSetName, defaultDataType)],
            new LayoutSet()
            {
                DataType = defaultDataType.Id,
                Id = layoutSetName,
                Tasks = [taskId],
            }
        );
        appServices.AppResourcesMock.Setup(a => a.GetLayoutModelForTask(taskId)).Returns(layoutModel);

        var data = new DataElement()
        {
            Id = dataGuid.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = defaultDataType.Id,
        };
        var instance = new Instance()
        {
            Id = $"{partyId}/{instanceGuid}",
            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
            InstanceOwner = new InstanceOwner() { PartyId = partyId.ToString() },
            Data = [data],
            Process = new() { CurrentTask = new() { ElementId = taskId } },
        };

        appServices.Storage.AddInstance(instance);
        appServices.Storage.AddData(dataGuid, SerializeXml(model));

        var instanceCopy = JsonSerializer.Deserialize<Instance>(JsonSerializer.SerializeToUtf8Bytes(instance))!;

        var initializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        return await initializer.Init(instanceCopy, taskId, language);
    }

    private static byte[] SerializeXml<T>(T model)
        where T : class, new()
    {
        XmlWriterSettings xmlWriterSettings = new XmlWriterSettings()
        {
            Encoding = new UTF8Encoding(false),
            NewLineHandling = NewLineHandling.None,
        };
        using var memoryStream = new MemoryStream();
        using XmlWriter xmlWriter = XmlWriter.Create(memoryStream, xmlWriterSettings);

        XmlSerializer serializer = new XmlSerializer(model.GetType());
        serializer.Serialize(xmlWriter, model);
        return memoryStream.ToArray();
    }
}
