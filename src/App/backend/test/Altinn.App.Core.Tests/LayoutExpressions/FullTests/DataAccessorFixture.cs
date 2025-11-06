using System.Runtime.CompilerServices;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests;

public sealed class DataAccessorFixture
{
    public const string Org = "ttd";
    public const string App = "data-accessor-fixture";
    public const string TaskId = "Task_1-access";
    public const int InstanceOwnerPartyId = 1337;
    public static readonly Guid InstanceGuid = Guid.Parse("00000000-BABE-0000-0000-000000000001");

    public Mock<IAppResources> AppResourcesMock { get; } = new(MockBehavior.Strict);
    public Mock<IAppMetadata> AppMetadataMock { get; } = new(MockBehavior.Strict);
    public Mock<IAppModel> AppModelMock { get; } = new(MockBehavior.Strict);

    public Mock<IDataClient> DataClientMock { get; } = new(MockBehavior.Strict);
    public Mock<IInstanceClient> InstanceClientMock { get; } = new(MockBehavior.Strict);

    internal Mock<IDataElementAccessChecker> DataElementAccessCheckerMock { get; } = new(MockBehavior.Strict);
    public Mock<IHostEnvironment> HostEnvironmentMock { get; } = new(MockBehavior.Strict);

    public FrontEndSettings FrontEndSettings { get; } = new();
    public GeneralSettings GeneralSettings { get; } = new();
    public AppSettings AppSettings { get; } = new();
    public ApplicationMetadata ApplicationMetadata { get; } = new($"{Org}/{App}") { DataTypes = [] };

    public Instance Instance = new()
    {
        Id = $"{InstanceOwnerPartyId}/{InstanceGuid}",
        InstanceOwner = new() { PartyId = InstanceOwnerPartyId.ToString() },
        Data = [],
    };

    public IServiceCollection ServiceCollection { get; } = new ServiceCollection();

    public ServiceProvider BuildServiceProvider() => ServiceCollection.BuildServiceProvider(validateScopes: true);

    private DataAccessorFixture(ITestOutputHelper outputHelper)
    {
        AppMetadataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(ApplicationMetadata);
        ServiceCollection.AddSingleton(AppResourcesMock.Object);
        ServiceCollection.AddSingleton(AppMetadataMock.Object);
        ServiceCollection.AddSingleton(Options.Create(FrontEndSettings));
        ServiceCollection.AddSingleton(Options.Create(GeneralSettings));
        ServiceCollection.AddSingleton(Options.Create(AppSettings));
        ServiceCollection.AddSingleton(AppModelMock.Object);
        ServiceCollection.AddSingleton(DataClientMock.Object);
        ServiceCollection.AddSingleton<ITranslationService, TranslationService>();
        ServiceCollection.AddSingleton(InstanceClientMock.Object);
        ServiceCollection.AddSingleton(DataElementAccessCheckerMock.Object);
        ServiceCollection.AddSingleton(HostEnvironmentMock.Object);
        ServiceCollection.AddSingleton<InstanceDataUnitOfWorkInitializer>();
        ServiceCollection.AddSingleton<ModelSerializationService>();
        ServiceCollection.AddTransient<IValidator, RequiredLayoutValidator>();
        ServiceCollection.AddTransient<IValidatorFactory, ValidatorFactory>();
        ServiceCollection.AddTransient<IValidationService, ValidationService>();
        ServiceCollection.AddTransient<ILayoutEvaluatorStateInitializer, LayoutEvaluatorStateInitializer>();
        ServiceCollection.AddTransient<AppImplementationFactory>();
        ServiceCollection.AddSingleton(new AppIdentifier(Org, App));
        ServiceCollection.AddFakeLoggingWithXunit(outputHelper);
        AppResourcesMock
            .Setup(ar => ar.GetLayoutSet())
            .Returns(
                new LayoutSets()
                {
                    // RequiredLayoutValidator checks to see if TaskId has a layout to see if it should run
                    Sets = new()
                    {
                        new()
                        {
                            Id = "default",
                            DataType = "fake",
                            Tasks = new() { TaskId },
                        },
                    },
                }
            );
        AppResourcesMock
            .Setup(a => a.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(
                new TextResource()
                {
                    Id = "nb",
                    Language = "nb",
                    Resources =
                    [
                        new()
                        {
                            Id = "backend.validation_errors.required",
                            Value = "{0} is required in component with id {1}.{2}.{3} for binding {4}",
                            Variables =
                            [
                                new() { Key = "field", DataSource = "customTextParameters" },
                                new() { Key = "layoutId", DataSource = "customTextParameters" },
                                new() { Key = "pageId", DataSource = "customTextParameters" },
                                new() { Key = "componentId", DataSource = "customTextParameters" },
                                new() { Key = "bindingName", DataSource = "customTextParameters" },
                            ],
                        },
                        new() { Id = "subPage", Value = "Underside" },
                    ],
                }
            );
        HostEnvironmentMock.SetupGet(h => h.EnvironmentName).Returns("Development");
    }

    public static async Task<DataAccessorFixture> CreateAsync(
        List<LayoutSetSpec> specs,
        ITestOutputHelper outputHelper,
        [CallerFilePath] string callerFilePath = ""
    )
    {
        var fixture = new DataAccessorFixture(outputHelper);
        await fixture.AddLayouts(specs, callerFilePath);
        return fixture;
    }

    public record LayoutSetSpec(string LayoutSetName, Type ModelType, int MaxCount);

    /// <summary>
    /// The first spec is the default layout set. The remaining can be referenced as subforms
    /// </summary>
    private async Task AddLayouts(List<LayoutSetSpec> specs, string callerFilePath)
    {
        var directory =
            Path.GetDirectoryName(callerFilePath) ?? throw new InvalidOperationException("Could not get directory");
        List<LayoutSetComponent> layouts = [];

        foreach (var spec in specs)
        {
            var layoutDir = Path.Join(directory, spec.LayoutSetName);
            if (!Directory.Exists(layoutDir))
            {
                throw new DirectoryNotFoundException($"Missing layout directory: {layoutDir}");
            }
            var pageNames = Directory
                .GetFiles(layoutDir, "*.json")
                .Select(Path.GetFileNameWithoutExtension)
                .OrderBy(n => n, StringComparer.OrdinalIgnoreCase);

            var pages = await Task.WhenAll(
                pageNames.Select(async pageName =>
                {
                    var pageText = await File.ReadAllTextAsync(
                        Path.Join(directory, spec.LayoutSetName, $"{pageName}.json")
                    );
                    using var document = JsonDocument.Parse(pageText);
                    var pageComponent = PageComponent.Parse(document.RootElement, pageName!, spec.LayoutSetName);
                    return pageComponent;
                })
            );

            var dataType = new DataType()
            {
                Id = spec.LayoutSetName + "_dataType",
                TaskId = TaskId,
                AppLogic = new() { ClassRef = spec.ModelType.FullName },
                MaxCount = spec.MaxCount,
            };
            ApplicationMetadata.DataTypes.Add(dataType);

            AppModelMock.Setup(am => am.GetModelType(spec.ModelType.FullName!)).Returns(spec.ModelType);
            AppModelMock
                .Setup(am => am.Create(spec.ModelType.FullName!))
                .Returns(Activator.CreateInstance(spec.ModelType)!);

            var layoutSet = new LayoutSetComponent(pages.ToList(), spec.LayoutSetName, dataType);
            layouts.Add(layoutSet);
        }

        var layoutModel = new LayoutModel(layouts, null);
        AppResourcesMock.Setup(ar => ar.GetLayoutModelForTask(TaskId)).Returns(layoutModel);
    }

    public void AddFormData(object data, int? maxCount = null)
    {
        var fullName = data.GetType().FullName;
        var dataType = ApplicationMetadata.DataTypes.Find(dt => dt.AppLogic?.ClassRef == fullName);

        if (dataType == null && maxCount != null)
        {
            dataType = new DataType()
            {
                Id = data.GetType().Name,
                TaskId = TaskId,
                MaxCount = maxCount.Value,
                AppLogic = new() { ClassRef = fullName },
            };
            ApplicationMetadata.DataTypes.Add(dataType);
            AppModelMock.Setup(am => am.GetModelType(fullName!)).Returns(data.GetType());
            AppModelMock.Setup(am => am.Create(fullName!)).Returns(Activator.CreateInstance(data.GetType())!);
        }
        else if (dataType is null)
        {
            throw new ArgumentException($"Data type {fullName} not found in ApplicationMetadata");
        }
        var dataGuid = Guid.NewGuid();
        var dataElement = new DataElement()
        {
            Id = dataGuid.ToString(),
            DataType = dataType.Id,
            ContentType = "application/xml",
        };
        Instance.Data.Add(dataElement);
        var serializationService = new ModelSerializationService(AppModelMock.Object);
        DataClientMock
            .Setup(dc =>
                dc.GetDataBytes(
                    InstanceOwnerPartyId,
                    InstanceGuid,
                    dataGuid,
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(serializationService.SerializeToStorage(data, dataType, dataElement).data.ToArray());
    }
}
