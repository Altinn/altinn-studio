using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features.Bootstrap;

public class FormBootstrapServiceTests
{
    private readonly Mock<IAppResources> _appResources = new();
    private readonly Mock<IAppMetadata> _appMetadata = new();
    private readonly Mock<ILayoutAnalysisService> _layoutAnalysis = new();
    private readonly Mock<IAppOptionsService> _appOptionsService = new();
    private readonly Mock<IInitialValidationService> _initialValidationService = new();
    private readonly Mock<IDataClient> _dataClient = new();
    private readonly Mock<IAppModel> _appModel = new();
    private readonly Mock<ILogger<FormBootstrapService>> _logger = new();

    private FormBootstrapService CreateService() =>
        new(
            _appResources.Object,
            _appMetadata.Object,
            _layoutAnalysis.Object,
            _appOptionsService.Object,
            _initialValidationService.Object,
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
    public async Task GetInstanceFormBootstrap_PartitionsInitialValidationIssues()
    {
        var dataElementId = Guid.NewGuid().ToString();
        var instance = CreateTestInstance("Task_1", dataElementId: dataElementId);
        var layoutSet = new LayoutSet
        {
            Id = "form",
            DataType = "model",
            Tasks = ["Task_1"],
        };
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(instance, layoutSet, appMetadata);
        _initialValidationService
            .Setup(x => x.Validate(instance, "Task_1", "nb", It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new ValidationIssueWithSource
                {
                    Severity = ValidationIssueSeverity.Error,
                    Code = "required",
                    Description = "Field is required",
                    Source = "Required",
                    Field = "some.path",
                    DataElementId = dataElementId,
                },
                new ValidationIssueWithSource
                {
                    Severity = ValidationIssueSeverity.Error,
                    Code = "task.error",
                    Description = "Task level error",
                    Source = "TaskValidator",
                },
            ]);

        var service = CreateService();

        var result = await service.GetInstanceFormBootstrap(instance, null, null, false, "nb");

        Assert.Single(result.ValidationIssues!);
        Assert.Equal("task.error", result.ValidationIssues![0].Code);
        Assert.Single(result.DataModels["model"].InitialValidationIssues!);
        Assert.Equal("required", result.DataModels["model"].InitialValidationIssues![0].Code);
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
        Assert.All(result.DataModels.Values, dataModel => Assert.Null(dataModel.InitialValidationIssues));
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_PdfMode_DoesNotIncludeInitialValidationIssues()
    {
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

        var result = await service.GetInstanceFormBootstrap(instance, null, null, true, "nb");

        Assert.Null(result.ValidationIssues);
        Assert.All(result.DataModels.Values, dataModel => Assert.Null(dataModel.InitialValidationIssues));
        _initialValidationService.Verify(
            x =>
                x.Validate(It.IsAny<Instance>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
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

        SetupMocks(
            instance,
            layoutSet,
            appMetadata,
            staticOptions: new Dictionary<string, List<Dictionary<string, string>>>
            {
                ["countries"] = [new Dictionary<string, string>()],
                ["regions"] = [new Dictionary<string, string>()],
            }
        );
        _appOptionsService
            .Setup(x => x.GetOptionsAsync("countries", "nb", It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(
                new AppOptions
                {
                    Options =
                    [
                        new AppOption { Value = "NO", Label = "Norway" },
                        new AppOption { Value = "SE", Label = "Sweden" },
                    ],
                }
            );
        _appOptionsService
            .Setup(x => x.GetOptionsAsync("regions", "nb", It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(new AppOptions { Options = [new AppOption { Value = "1", Label = "Region 1" }] });

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
        Assert.Equal(2, result.StaticOptions["countries"].Variants[0].Options.Count);
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

        SetupMocks(
            instance,
            layoutSet,
            appMetadata,
            staticOptions: new Dictionary<string, List<Dictionary<string, string>>>
            {
                ["valid"] = [new Dictionary<string, string>()],
                ["invalid"] = [new Dictionary<string, string>()],
            }
        );
        _appOptionsService
            .Setup(x => x.GetOptionsAsync("valid", "nb", It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(new AppOptions { Options = [new AppOption { Value = "1", Label = "Valid" }] });
        _appOptionsService
            .Setup(x => x.GetOptionsAsync("invalid", "nb", It.IsAny<Dictionary<string, string>>()))
            .ThrowsAsync(new Exception("Not found"));

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
        Dictionary<string, List<Dictionary<string, string>>>? staticOptions = null
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
        _layoutAnalysis.Setup(x => x.GetStaticOptions(It.IsAny<object>())).Returns(staticOptions ?? []);

        _appOptionsService
            .Setup(x =>
                x.GetOptionsAsync(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Dictionary<string, string>>()
                )
            )
            .ReturnsAsync((AppOptions?)null);
        _appOptionsService
            .Setup(x =>
                x.GetOptionsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, string>>())
            )
            .ReturnsAsync(new AppOptions { Options = [] });
        _initialValidationService
            .Setup(x =>
                x.Validate(It.IsAny<Instance>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync([]);

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
        _layoutAnalysis.Setup(x => x.GetStaticOptions(It.IsAny<object>())).Returns([]);
        _appOptionsService
            .Setup(x =>
                x.GetOptionsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, string>>())
            )
            .ReturnsAsync(new AppOptions { Options = [] });

        _appModel.Setup(x => x.Create(It.IsAny<string>())).Returns(new object());
    }
}
