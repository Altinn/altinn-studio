using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features.Bootstrap;

public class FormBootstrapServiceTests
{
    private readonly Mock<IAppResources> _appResources = new();
    private readonly Mock<IAppMetadata> _appMetadata = new();
    private readonly Mock<ILayoutAnalysisService> _layoutAnalysis = new();
    private readonly Mock<IDataClient> _dataClient = new();
    private readonly Mock<IAppModel> _appModel = new();
    private readonly Mock<ILogger<FormBootstrapService>> _logger = new();
    private readonly Mock<IAppOptionsFileHandler> _optionsFileHandler = new();
    private readonly AppImplementationFactory _appImplementationFactory;

    public FormBootstrapServiceTests()
    {
        var services = new ServiceCollection();
        services.AddSingleton(_optionsFileHandler.Object);
        var serviceProvider = services.BuildServiceProvider();
        _appImplementationFactory = new AppImplementationFactory(serviceProvider);
    }

    private FormBootstrapService CreateService() =>
        new(
            _appResources.Object,
            _appMetadata.Object,
            _layoutAnalysis.Object,
            _appImplementationFactory,
            _dataClient.Object,
            _appModel.Object,
            _logger.Object
        );

    [Fact]
    public async Task GetInstanceFormBootstrap_ReturnsExpectedShape()
    {
        // Arrange
        var instance = CreateTestInstance("Task_1");
        var layoutSet = new LayoutSet
        {
            Id = "form",
            DataType = "model",
            Tasks = ["Task_1"],
        };
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(instance, layoutSet, appMetadata);

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            layoutSetIdOverride: null,
            dataElementIdOverride: null,
            isPdf: false,
            language: "nb"
        );

        // Assert - Response shape
        Assert.Equal(1, result.SchemaVersion);
        Assert.NotNull(result.Layouts);
        Assert.NotNull(result.DataModels);
        Assert.NotNull(result.StaticOptions);
        Assert.NotNull(result.Metadata);
        Assert.Equal("form", result.Metadata.LayoutSetId);
        Assert.Equal("model", result.Metadata.DefaultDataType);
        Assert.False(result.Metadata.IsSubform);
        Assert.False(result.Metadata.IsPdf);
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_ReturnsExpectedShape()
    {
        // Arrange
        var layoutSet = new LayoutSet { Id = "stateless", DataType = "model" };
        var appMetadata = CreateAppMetadata("model");

        SetupStatelessMocks(layoutSet, appMetadata);

        var service = CreateService();

        // Act
        var result = await service.GetStatelessFormBootstrap("stateless", "nb");

        // Assert
        Assert.Equal(1, result.SchemaVersion);
        Assert.NotNull(result.Layouts);
        Assert.NotNull(result.DataModels);
        Assert.NotNull(result.StaticOptions);
        Assert.Null(result.ValidationIssues); // Stateless should not have validation
        Assert.Equal("stateless", result.Metadata.LayoutSetId);
        Assert.False(result.Metadata.IsSubform);
        Assert.False(result.Metadata.IsPdf);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_SubformOverride_SetsIsSubformTrue()
    {
        // Arrange
        var instance = CreateTestInstance("Task_1");
        var layoutSet = new LayoutSet
        {
            Id = "subform",
            DataType = "submodel",
            Tasks = ["Task_1"],
        };
        var appMetadata = CreateAppMetadata("model", "submodel");

        SetupMocks(instance, layoutSet, appMetadata, layoutSetId: "subform");

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            layoutSetIdOverride: "subform",
            dataElementIdOverride: null,
            isPdf: false,
            language: "nb"
        );

        // Assert
        Assert.True(result.Metadata.IsSubform);
        Assert.Equal("subform", result.Metadata.LayoutSetId);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_PdfMode_SetsIsPdfTrue()
    {
        // Arrange
        var instance = CreateTestInstance("Task_1");
        var layoutSet = new LayoutSet
        {
            Id = "form",
            DataType = "model",
            Tasks = ["Task_1"],
        };
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(instance, layoutSet, appMetadata);

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            layoutSetIdOverride: null,
            dataElementIdOverride: null,
            isPdf: true,
            language: "nb"
        );

        // Assert
        Assert.True(result.Metadata.IsPdf);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_PdfMode_ExcludesExpressionValidationConfig()
    {
        // Arrange
        var instance = CreateTestInstance("Task_1");
        var layoutSet = new LayoutSet
        {
            Id = "form",
            DataType = "model",
            Tasks = ["Task_1"],
        };
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(instance, layoutSet, appMetadata, hasValidationConfig: true);

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            layoutSetIdOverride: null,
            dataElementIdOverride: null,
            isPdf: true,
            language: "nb"
        );

        // Assert
        Assert.True(result.DataModels.ContainsKey("model"));
        Assert.Null(result.DataModels["model"].ExpressionValidationConfig);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_LockedDataElement_ExcludesExpressionValidationConfig()
    {
        // Arrange
        var instance = CreateTestInstance("Task_1", locked: true);
        var layoutSet = new LayoutSet
        {
            Id = "form",
            DataType = "model",
            Tasks = ["Task_1"],
        };
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(instance, layoutSet, appMetadata, hasValidationConfig: true);

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            layoutSetIdOverride: null,
            dataElementIdOverride: null,
            isPdf: false,
            language: "nb"
        );

        // Assert
        Assert.True(result.DataModels.ContainsKey("model"));
        Assert.Null(result.DataModels["model"].ExpressionValidationConfig);
        Assert.False(result.DataModels["model"].IsWritable);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_IncludesStaticOptions()
    {
        // Arrange
        var instance = CreateTestInstance("Task_1");
        var layoutSet = new LayoutSet
        {
            Id = "form",
            DataType = "model",
            Tasks = ["Task_1"],
        };
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(instance, layoutSet, appMetadata, staticOptionIds: ["countries", "regions"]);
        _optionsFileHandler
            .Setup(x => x.ReadOptionsFromFileAsync("countries"))
            .ReturnsAsync([
                new AppOption { Value = "NO", Label = "Norway" },
                new AppOption { Value = "SE", Label = "Sweden" },
            ]);
        _optionsFileHandler
            .Setup(x => x.ReadOptionsFromFileAsync("regions"))
            .ReturnsAsync([new AppOption { Value = "1", Label = "Region 1" }]);

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            layoutSetIdOverride: null,
            dataElementIdOverride: null,
            isPdf: false,
            language: "nb"
        );

        // Assert
        Assert.Equal(2, result.StaticOptions.Count);
        Assert.True(result.StaticOptions.ContainsKey("countries"));
        Assert.True(result.StaticOptions.ContainsKey("regions"));
        Assert.Equal(2, result.StaticOptions["countries"].Count);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_PartialFailure_ReturnsRemainingValidData()
    {
        // Arrange
        var instance = CreateTestInstance("Task_1");
        var layoutSet = new LayoutSet
        {
            Id = "form",
            DataType = "model",
            Tasks = ["Task_1"],
        };
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(instance, layoutSet, appMetadata, staticOptionIds: ["valid", "invalid"]);
        _optionsFileHandler
            .Setup(x => x.ReadOptionsFromFileAsync("valid"))
            .ReturnsAsync([new AppOption { Value = "1", Label = "Valid" }]);
        _optionsFileHandler.Setup(x => x.ReadOptionsFromFileAsync("invalid")).ThrowsAsync(new Exception("Not found"));

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            layoutSetIdOverride: null,
            dataElementIdOverride: null,
            isPdf: false,
            language: "nb"
        );

        // Assert - Should return valid options, not fail entirely
        Assert.Single(result.StaticOptions);
        Assert.True(result.StaticOptions.ContainsKey("valid"));
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_DataElementIdOverride_ReturnsMatchingDataElement()
    {
        // Arrange
        var dataElementId = Guid.NewGuid().ToString();
        var instance = CreateTestInstance("Task_1", dataElementId: dataElementId);
        var layoutSet = new LayoutSet
        {
            Id = "subform",
            DataType = "submodel",
            Tasks = ["Task_1"],
        };
        var appMetadata = CreateAppMetadata("model", "submodel");

        SetupMocks(instance, layoutSet, appMetadata, layoutSetId: "subform", dataType: "submodel");

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            layoutSetIdOverride: "subform",
            dataElementIdOverride: dataElementId,
            isPdf: false,
            language: "nb"
        );

        // Assert
        Assert.True(result.DataModels.ContainsKey("submodel"));
        Assert.Equal(dataElementId, result.DataModels["submodel"].DataElementId);
    }

    private static Instance CreateTestInstance(string taskId, bool locked = false, string? dataElementId = null)
    {
        var elementId = dataElementId ?? Guid.NewGuid().ToString();
        return new Instance
        {
            Id = "12345/abcdef",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data =
            [
                new DataElement
                {
                    Id = elementId,
                    DataType = "model",
                    Locked = locked,
                },
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = "submodel",
                    Locked = false,
                },
            ],
        };
    }

    private static ApplicationMetadata CreateAppMetadata(params string[] dataTypes)
    {
        return new ApplicationMetadata("ttd/test")
        {
            DataTypes = dataTypes
                .Select(dt => new DataType
                {
                    Id = dt,
                    AppLogic = new ApplicationLogic { ClassRef = $"TestApp.Models.{dt}" },
                })
                .ToList(),
        };
    }

    private void SetupMocks(
        Instance instance,
        LayoutSet layoutSet,
        ApplicationMetadata appMetadata,
        string layoutSetId = "form",
        string dataType = "model",
        bool hasValidationConfig = false,
        string[]? staticOptionIds = null
    )
    {
        _appResources.Setup(x => x.GetLayoutSetForTask(It.IsAny<string>())).Returns(layoutSet);
        _appResources.Setup(x => x.GetLayoutSets()).Returns(new LayoutSets { Sets = [layoutSet] });
        _appResources.Setup(x => x.GetLayoutsForSet(layoutSetId)).Returns("""{"page1": {"data": {"layout": []}}}""");
        _appResources.Setup(x => x.GetLayoutSettingsStringForSet(layoutSetId)).Returns((string?)null);
        _appResources.Setup(x => x.GetModelJsonSchema(It.IsAny<string>())).Returns("""{"type": "object"}""");
        _appResources
            .Setup(x => x.GetValidationConfiguration(It.IsAny<string>()))
            .Returns(hasValidationConfig ? """{"validations": []}""" : null);

        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        _layoutAnalysis
            .Setup(x => x.GetReferencedDataTypes(It.IsAny<object>(), It.IsAny<string>()))
            .Returns(new HashSet<string> { dataType });
        _layoutAnalysis
            .Setup(x => x.GetStaticOptionIds(It.IsAny<object>()))
            .Returns(staticOptionIds?.ToHashSet() ?? []);

        _dataClient
            .Setup(x =>
                x.GetFormData(It.IsAny<Instance>(), It.IsAny<DataElement>(), null, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(new object());
    }

    private void SetupStatelessMocks(LayoutSet layoutSet, ApplicationMetadata appMetadata)
    {
        _appResources.Setup(x => x.GetLayoutSets()).Returns(new LayoutSets { Sets = [layoutSet] });
        _appResources.Setup(x => x.GetLayoutsForSet(layoutSet.Id)).Returns("""{"page1": {"data": {"layout": []}}}""");
        _appResources.Setup(x => x.GetLayoutSettingsStringForSet(layoutSet.Id)).Returns((string?)null);
        _appResources.Setup(x => x.GetModelJsonSchema(It.IsAny<string>())).Returns("""{"type": "object"}""");
        _appResources.Setup(x => x.GetValidationConfiguration(It.IsAny<string>())).Returns((string?)null);

        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        _layoutAnalysis
            .Setup(x => x.GetReferencedDataTypes(It.IsAny<object>(), It.IsAny<string>()))
            .Returns(new HashSet<string> { layoutSet.DataType });
        _layoutAnalysis.Setup(x => x.GetStaticOptionIds(It.IsAny<object>())).Returns(new HashSet<string>());

        _appModel.Setup(x => x.Create(It.IsAny<string>())).Returns(new object());
    }
}
