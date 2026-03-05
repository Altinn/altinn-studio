using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features.Bootstrap;

public class FormBootstrapServiceTests
{
    private readonly Mock<IAppResources> _appResources = new();
    private readonly Mock<IAppMetadata> _appMetadata = new();
    private readonly Mock<IAppOptionsService> _appOptionsService = new();
    private readonly Mock<IAppOptionsFileHandler> _appOptionsFileHandler = new();
    private readonly Mock<IInitialValidationService> _initialValidationService = new();
    private readonly Mock<IDataClient> _dataClient = new();
    private readonly Mock<IAppModel> _appModel = new();
    private readonly Mock<ILogger<FormBootstrapService>> _logger = new();

    private FormBootstrapService CreateService() =>
        new(
            _appResources.Object,
            _appMetadata.Object,
            _appOptionsService.Object,
            CreateAppImplementationFactory(),
            _initialValidationService.Object,
            _dataClient.Object,
            _appModel.Object,
            _logger.Object
        );

    private AppImplementationFactory CreateAppImplementationFactory()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        services.AddSingleton(_appOptionsFileHandler.Object);
        return new AppImplementationFactory(services.BuildServiceProvider());
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_ReturnsExpectedShape()
    {
        // Arrange
        var instance = CreateTestInstance("Task_1");
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(appMetadata);

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            uiFolder: "Task_1",
            dataElementIdOverride: null,
            isPdf: false,
            language: "nb"
        );

        // Assert - Response shape
        Assert.NotNull(result.Layouts);
        Assert.NotNull(result.DataModels);
        Assert.NotNull(result.StaticOptions);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_PartitionsInitialValidationIssues()
    {
        var dataElementId = Guid.NewGuid().ToString();
        var instance = CreateTestInstance("Task_1", dataElementId: dataElementId);
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(appMetadata);
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

        var result = await service.GetInstanceFormBootstrap(instance, "Task_1", null, false, "nb");

        Assert.Single(result.ValidationIssues!);
        Assert.Equal("task.error", result.ValidationIssues![0].Code);
        Assert.Single(result.DataModels["model"].InitialValidationIssues!);
        Assert.Equal("required", result.DataModels["model"].InitialValidationIssues![0].Code);
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_ReturnsExpectedShape()
    {
        // Arrange
        var appMetadata = CreateAppMetadata("model");

        SetupStatelessMocks(appMetadata);

        var service = CreateService();

        // Act
        var result = await service.GetStatelessFormBootstrap("stateless", "nb");

        // Assert
        Assert.NotNull(result.Layouts);
        Assert.NotNull(result.DataModels);
        Assert.NotNull(result.StaticOptions);
        Assert.Null(result.ValidationIssues); // Stateless should not have validation
        Assert.All(result.DataModels.Values, dataModel => Assert.Null(dataModel.InitialValidationIssues));
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_PdfMode_DoesNotIncludeInitialValidationIssues()
    {
        var instance = CreateTestInstance("Task_1");
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(appMetadata);
        var service = CreateService();

        var result = await service.GetInstanceFormBootstrap(instance, "Task_1", null, true, "nb");

        Assert.Null(result.ValidationIssues);
        Assert.All(result.DataModels.Values, dataModel => Assert.Null(dataModel.InitialValidationIssues));
        _initialValidationService.Verify(
            x =>
                x.Validate(It.IsAny<Instance>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_PdfMode_ExcludesExpressionValidationConfig()
    {
        // Arrange
        var instance = CreateTestInstance("Task_1");
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(appMetadata, hasValidationConfig: true);

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            uiFolder: "Task_1",
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
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(appMetadata, hasValidationConfig: true);

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            uiFolder: "Task_1",
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
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(
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
            uiFolder: "Task_1",
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
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(
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
            uiFolder: "Task_1",
            dataElementIdOverride: null,
            isPdf: false,
            language: "nb"
        );

        // Assert - Should return valid options, not fail entirely
        Assert.Single(result.StaticOptions);
        Assert.True(result.StaticOptions.ContainsKey("valid"));
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_IncludesOptionsFromJsonFile_WhenComponentConfigIsDynamic()
    {
        var instance = CreateTestInstance("Task_1");
        var appMetadata = CreateAppMetadata("model");

        var dynamicReference = new Dictionary<string, List<Dictionary<string, string>>>
        {
            ["fileBased"] = [new Dictionary<string, string> { ["region"] = "europe" }],
        };
        SetupMocks(appMetadata, staticOptions: dynamicReference);

        _appOptionsFileHandler
            .Setup(x => x.ReadOptionsFromFileAsync("fileBased"))
            .ReturnsAsync([new AppOption { Value = "1", Label = "From file" }]);

        var service = CreateService();

        var result = await service.GetInstanceFormBootstrap(instance, "Task_1", null, false, "nb");

        Assert.True(result.StaticOptions.ContainsKey("fileBased"));
        Assert.Single(result.StaticOptions["fileBased"]);
        _appOptionsService.Verify(
            x => x.GetOptionsAsync("fileBased", It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_DataElementIdOverride_ReturnsMatchingDataElement()
    {
        // Arrange
        var dataElementId = Guid.NewGuid().ToString();
        var instance = CreateTestInstance("Task_1", dataElementId: dataElementId);
        var appMetadata = CreateAppMetadata("model", "submodel");

        SetupMocks(appMetadata, uiFolder: "subform", dataType: "submodel");

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            uiFolder: "subform",
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
            Id = "12345/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
        ApplicationMetadata appMetadata,
        string uiFolder = "Task_1",
        string dataType = "model",
        bool hasValidationConfig = false,
        Dictionary<string, List<Dictionary<string, string>>>? staticOptions = null
    )
    {
        _appResources.Setup(x => x.GetLayoutsInFolder(It.IsAny<string>())).Returns(CreateLayoutsJson(staticOptions));
        _appResources.Setup(x => x.GetModelJsonSchema(It.IsAny<string>())).Returns("""{"type": "object"}""");
        _appResources
            .Setup(x => x.GetValidationConfiguration(It.IsAny<string>()))
            .Returns(hasValidationConfig ? """{"validations": []}""" : null);
        _appResources
            .Setup(x => x.GetLayoutSettingsForFolder(uiFolder))
            .Returns(new LayoutSettings { DefaultDataType = dataType });

        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);
        _appOptionsFileHandler
            .Setup(x => x.ReadOptionsFromFileAsync(It.IsAny<string>()))
            .ReturnsAsync((List<AppOption>?)null);

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

    private void SetupStatelessMocks(
        ApplicationMetadata appMetadata,
        string uiFolder = "stateless",
        string dataType = "model"
    )
    {
        _appResources.Setup(x => x.GetLayoutsInFolder(It.IsAny<string>())).Returns(CreateLayoutsJson());
        _appResources.Setup(x => x.GetModelJsonSchema(It.IsAny<string>())).Returns("""{"type": "object"}""");
        _appResources.Setup(x => x.GetValidationConfiguration(It.IsAny<string>())).Returns((string?)null);
        _appResources
            .Setup(x => x.GetLayoutSettingsForFolder(uiFolder))
            .Returns(new LayoutSettings { DefaultDataType = dataType });

        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);
        _appOptionsFileHandler
            .Setup(x => x.ReadOptionsFromFileAsync(It.IsAny<string>()))
            .ReturnsAsync((List<AppOption>?)null);
        _appOptionsService
            .Setup(x =>
                x.GetOptionsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, string>>())
            )
            .ReturnsAsync(new AppOptions { Options = [] });

        _appModel.Setup(x => x.Create(It.IsAny<string>())).Returns(new object());
    }

    private static string CreateLayoutsJson(Dictionary<string, List<Dictionary<string, string>>>? staticOptions = null)
    {
        var components = new List<Dictionary<string, object?>>();
        if (staticOptions is not null)
        {
            foreach (var (optionsId, variants) in staticOptions)
            {
                foreach (var queryParameters in variants)
                {
                    var component = new Dictionary<string, object?>
                    {
                        ["id"] = Guid.NewGuid().ToString("N"),
                        ["type"] = "Dropdown",
                        ["optionsId"] = optionsId,
                    };

                    if (queryParameters.Count > 0)
                    {
                        component["queryParameters"] = queryParameters;
                    }

                    components.Add(component);
                }
            }
        }

        var layout = new Dictionary<string, object?>
        {
            ["page1"] = new Dictionary<string, object?>
            {
                ["data"] = new Dictionary<string, object?> { ["layout"] = components },
            },
        };

        return JsonSerializer.Serialize(layout);
    }
}
