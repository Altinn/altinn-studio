using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Tests.Controllers.TestResources;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Api.Tests.Features.Bootstrap;

public class FormBootstrapServiceTests
{
    private readonly Mock<IAppResources> _appResources = new();
    private readonly Mock<IAppMetadata> _appMetadata = new();
    private readonly Mock<IAppOptionsService> _appOptionsService = new();
    private readonly Mock<IAppOptionsFileHandler> _appOptionsFileHandler = new();
    private readonly Mock<IValidationService> _validationService = new();
    private readonly Mock<IFormDataReader> _formDataReader = new();
    private readonly IAppModel _appModel = new AppModelMock<DummyModel>();
    private readonly Mock<IDataClient> _dataClient = new();
    private readonly Mock<IInstanceClient> _instanceClient = new();
    private readonly Mock<ITranslationService> _translationService = new();
    private readonly Mock<IDataProcessor> _dataProcessor = new();
    private readonly Mock<IPrefill> _prefillService = new();
    private readonly Mock<IAuthenticationContext> _authenticationContext = new();
    private readonly Mock<ILogger<FormBootstrapService>> _logger = new();

    private FormBootstrapService CreateService(IAppModel? appModel = null) =>
        new(
            _appResources.Object,
            _appMetadata.Object,
            _appOptionsService.Object,
            appModel ?? _appModel,
            _prefillService.Object,
            _authenticationContext.Object,
            CreateServiceProvider(appModel),
            _logger.Object
        );

    private IServiceProvider CreateServiceProvider(IAppModel? appModel = null)
    {
        var resolvedAppModel = appModel ?? _appModel;
        var services = new ServiceCollection();
        services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        services.AddSingleton(_dataClient.Object);
        services.AddSingleton(_instanceClient.Object);
        services.AddSingleton(_translationService.Object);
        services.AddSingleton(new ModelSerializationService(resolvedAppModel));
        services.AddSingleton<IOptions<FrontEndSettings>>(Options.Create(new FrontEndSettings()));
        services.AddSingleton(_appResources.Object);
        services.AddSingleton(_appMetadata.Object);
        services.AddSingleton(
            new InstanceDataUnitOfWorkInitializer(
                _dataClient.Object,
                _instanceClient.Object,
                _appMetadata.Object,
                _translationService.Object,
                new ModelSerializationService(resolvedAppModel),
                _appResources.Object,
                Options.Create(new FrontEndSettings())
            )
        );
        services.AddSingleton(_validationService.Object);
        services.AddSingleton(_formDataReader.Object);
        services.AddSingleton(_appOptionsFileHandler.Object);
        services.AddSingleton(_dataProcessor.Object);
        services.AddAppImplementationFactory();
        return services.BuildServiceProvider();
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
        var instance = CreateTestInstance("Task_1", defaultDataElementId: dataElementId);
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(appMetadata);
        _validationService
            .Setup(x => x.ValidateInstanceAtTask(It.IsAny<IInstanceDataAccessor>(), "Task_1", null, true, "nb"))
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
        var result = await service.GetStatelessFormBootstrap("stateless", "nb", ["model"]);

        // Assert
        Assert.NotNull(result.Layouts);
        Assert.NotNull(result.DataModels);
        Assert.NotNull(result.StaticOptions);
        Assert.Null(result.ValidationIssues); // Stateless should not have validation
        Assert.All(result.DataModels.Values, dataModel => Assert.Null(dataModel.InitialValidationIssues));
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_RunsProcessDataRead()
    {
        var appMetadata = CreateAppMetadata("model");

        SetupStatelessMocks(appMetadata);

        var service = CreateService();
        await service.GetStatelessFormBootstrap("stateless", "nn", ["model"]);

        _formDataReader.Verify(x => x.ReadStatelessFormData(It.IsAny<object>(), "nn", null), Times.Once);
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_InitializesAltinnRowIds()
    {
        var appModel = new AppModelMock<RowIdDummyModel>();
        var appMetadata = CreateAppMetadata(typeof(RowIdDummyModel), "model");

        SetupStatelessMocks(appMetadata);
        _formDataReader
            .Setup(x => x.ReadStatelessFormData(It.IsAny<object>(), It.IsAny<string?>(), It.IsAny<InstanceOwner?>()))
            .Callback<object, string?, InstanceOwner?>(
                (model, _, _) => ((RowIdDummyModel)model).Items = [new RowIdDummyItem()]
            )
            .Returns(Task.CompletedTask);

        var service = CreateService(appModel);

        var result = await service.GetStatelessFormBootstrap("stateless", "nb", ["model"]);

        var initialData = Assert.IsType<RowIdDummyModel>(result.DataModels["model"].InitialData);
        Assert.Single(initialData.Items);
        Assert.NotEqual(Guid.Empty, initialData.Items[0].AltinnRowId);
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_UsesPrefillForEachReferencedDataType()
    {
        var appMetadata = CreateAppMetadata("model", "submodel");
        SetupStatelessMocks(
            appMetadata,
            layoutsJson: """
            {
                "page1": {
                    "data": {
                        "layout": [
                            {
                                "id": "field1",
                                "type": "Input",
                                "dataModelBindings": {
                                    "simpleBinding": {
                                        "field": "Name",
                                        "dataType": "submodel"
                                    }
                                }
                            }
                        ]
                    }
                }
            }
            """
        );
        _authenticationContext
            .Setup(x => x.Current)
            .Returns(TestAuthentication.GetUserAuthentication(userPartyId: 501337));

        var service = CreateService();
        await service.GetStatelessFormBootstrap(
            "stateless",
            "nb",
            ["model", "submodel"],
            new Dictionary<string, Dictionary<string, string>>
            {
                ["model"] = new() { ["first"] = "one" },
                ["submodel"] = new() { ["second"] = "two" },
            }
        );

        _prefillService.Verify(
            x =>
                x.PrefillDataModel(
                    It.IsAny<object>(),
                    It.Is<Dictionary<string, string>>(prefill =>
                        prefill.Count == 1 && prefill.ContainsKey("first") && prefill["first"] == "one"
                    ),
                    true
                ),
            Times.Once
        );
        _prefillService.Verify(x => x.PrefillDataModel("501337", "model", It.IsAny<object>(), null), Times.Once);
        _prefillService.Verify(
            x =>
                x.PrefillDataModel(
                    It.IsAny<object>(),
                    It.Is<Dictionary<string, string>>(prefill =>
                        prefill.Count == 1 && prefill.ContainsKey("second") && prefill["second"] == "two"
                    ),
                    true
                ),
            Times.Once
        );
        _prefillService.Verify(x => x.PrefillDataModel("501337", "submodel", It.IsAny<object>(), null), Times.Once);
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_AnonymousUser_AppliesQueryParameterPrefill()
    {
        var appMetadata = CreateAppMetadata("model");

        SetupStatelessMocks(appMetadata);

        var service = CreateService();
        await service.GetStatelessFormBootstrap(
            "stateless",
            "nb",
            ["model"],
            new Dictionary<string, Dictionary<string, string>> { ["model"] = new() { ["first"] = "one" } }
        );

        _prefillService.Verify(
            x =>
                x.PrefillDataModel(
                    It.IsAny<object>(),
                    It.Is<Dictionary<string, string>>(prefill =>
                        prefill.Count == 1 && prefill.ContainsKey("first") && prefill["first"] == "one"
                    ),
                    true
                ),
            Times.Once
        );
        _prefillService.Verify(
            x =>
                x.PrefillDataModel(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<object>(),
                    It.IsAny<Dictionary<string, string>?>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_DefaultDataModelFailure_IsSurfaced()
    {
        var appMetadata = CreateAppMetadata("model");

        SetupStatelessMocks(appMetadata);
        _formDataReader
            .Setup(x => x.ReadStatelessFormData(It.IsAny<object>(), It.IsAny<string?>(), It.IsAny<InstanceOwner?>()))
            .ThrowsAsync(new InvalidOperationException("prefill failed"));

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.GetStatelessFormBootstrap("stateless", "nb", ["model"])
        );
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
        _validationService.Verify(
            x =>
                x.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<string>(),
                    null,
                    true,
                    It.IsAny<string>()
                ),
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
        Assert.Equal(2, result.StaticOptions["countries"].Options.Count);
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
    public async Task GetInstanceFormBootstrap_WhenReferencedDataModelFailsToLoad_Throws()
    {
        var instance = CreateTestInstance("Task_1");
        var appMetadata = CreateAppMetadata("model", "submodel");

        SetupMocks(
            appMetadata,
            layoutsJson: """
            {
                "page1": {
                    "data": {
                        "layout": [
                            {
                                "id": "field1",
                                "type": "Input",
                                "dataModelBindings": {
                                    "simpleBinding": {
                                        "field": "Name",
                                        "dataType": "submodel"
                                    }
                                }
                            }
                        ]
                    }
                }
            }
            """
        );
        _formDataReader
            .Setup(x =>
                x.ProcessLoadedFormData(
                    It.IsAny<Instance>(),
                    It.Is<DataElement>(d => d.DataType == "submodel"),
                    It.IsAny<object>(),
                    It.IsAny<bool>(),
                    It.IsAny<string?>(),
                    It.IsAny<Func<object, CancellationToken, Task>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new ApplicationException("Failed to load submodel"));

        var service = CreateService();

        await Assert.ThrowsAsync<ApplicationException>(() =>
            service.GetInstanceFormBootstrap(instance, "Task_1", null, false, "nb")
        );
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
        Assert.Single(result.StaticOptions["fileBased"].Options);
        _appOptionsService.Verify(
            x => x.GetOptionsAsync("fileBased", It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_IncludesDownstreamParametersForFetchedStaticOptions()
    {
        var instance = CreateTestInstance("Task_1");
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(
            appMetadata,
            staticOptions: new Dictionary<string, List<Dictionary<string, string>>>
            {
                ["countries"] = [new Dictionary<string, string>()],
                ["fileBased"] = [new Dictionary<string, string>()],
            }
        );

        _appOptionsFileHandler
            .Setup(x => x.ReadOptionsFromFileAsync("fileBased"))
            .ReturnsAsync([new AppOption { Value = "1", Label = "From file" }]);
        _appOptionsService
            .Setup(x => x.GetOptionsAsync("countries", "nb", It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(
                new AppOptions
                {
                    Options = [new AppOption { Value = "NO", Label = "Norway" }],
                    Parameters = new Dictionary<string, string?> { ["version"] = "1", ["language"] = "nb" },
                }
            );

        var service = CreateService();
        var result = await service.GetInstanceFormBootstrap(instance, "Task_1", null, false, "nb");

        Assert.Equal("version=1,language=nb", result.StaticOptions["countries"].DownstreamParameters);
        Assert.Null(result.StaticOptions["fileBased"].DownstreamParameters);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_DataElementIdOverride_ReturnsMatchingDataElement()
    {
        // Arrange
        var dataElementId = Guid.NewGuid().ToString();
        var instance = CreateTestInstance("Task_1", defaultDataElementId: dataElementId);
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

    [Fact]
    public async Task GetInstanceFormBootstrap_DataElementIdOverride_OnlyAppliesToDefaultDataType()
    {
        // Arrange
        var parentDataElementId = Guid.NewGuid().ToString();
        var subformDataElementId = Guid.NewGuid().ToString();
        var instance = CreateTestInstance(
            "Task_1",
            defaultDataElementId: parentDataElementId,
            submodelDataElementId: subformDataElementId
        );
        var appMetadata = CreateAppMetadata("model", "submodel");

        SetupMocks(appMetadata, uiFolder: "subform", dataType: "submodel");
        _appResources
            .Setup(x => x.GetLayoutsInFolder("subform"))
            .Returns(
                """
                {
                    "page1": {
                        "data": {
                            "layout": [
                                {
                                    "id": "field1",
                                    "type": "Input",
                                    "dataModelBindings": {
                                        "simpleBinding": {
                                            "field": "Name",
                                            "dataType": "model"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
                """
            );

        var service = CreateService();

        // Act
        var result = await service.GetInstanceFormBootstrap(
            instance,
            uiFolder: "subform",
            dataElementIdOverride: subformDataElementId,
            isPdf: false,
            language: "nb"
        );

        // Assert
        Assert.Equal(subformDataElementId, result.DataModels["submodel"].DataElementId);
        Assert.Equal(parentDataElementId, result.DataModels["model"].DataElementId);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_DataElementIdOverride_PartitionsFieldValidationToOverride()
    {
        var parentDataElementId = Guid.NewGuid().ToString();
        var subformDataElementId = Guid.NewGuid().ToString();
        var instance = CreateTestInstance(
            "Task_1",
            defaultDataElementId: parentDataElementId,
            submodelDataElementId: subformDataElementId
        );
        var appMetadata = CreateAppMetadata("model", "submodel");

        SetupMocks(appMetadata, uiFolder: "subform", dataType: "submodel");
        _validationService
            .Setup(x => x.ValidateInstanceAtTask(It.IsAny<IInstanceDataAccessor>(), "Task_1", null, true, "nb"))
            .ReturnsAsync([
                new ValidationIssueWithSource
                {
                    Severity = ValidationIssueSeverity.Error,
                    Code = "required",
                    Description = "Field is required",
                    Source = "Required",
                    Field = "some.path",
                    DataElementId = null,
                },
            ]);

        var service = CreateService();
        var result = await service.GetInstanceFormBootstrap(instance, "subform", subformDataElementId, false, "nb");

        Assert.Null(result.ValidationIssues);
        Assert.Single(result.DataModels["submodel"].InitialValidationIssues!);
        Assert.DoesNotContain(result.DataModels, entry => entry.Key == "model");
        Assert.Equal(subformDataElementId, result.DataModels["submodel"].InitialValidationIssues![0].DataElementId);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_WhenNonDefaultDataTypeHasMultipleDataElements_Throws()
    {
        var instance = CreateTestInstance("Task_1", includeExtraSubmodelElement: true);
        var appMetadata = CreateAppMetadata("model", "submodel");

        SetupMocks(appMetadata);
        _appResources
            .Setup(x => x.GetLayoutsInFolder("Task_1"))
            .Returns(
                """
                {
                    "page1": {
                        "data": {
                            "layout": [
                                {
                                    "id": "field1",
                                    "type": "Input",
                                    "dataModelBindings": {
                                        "simpleBinding": {
                                            "field": "Name",
                                            "dataType": "submodel"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
                """
            );

        var service = CreateService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.GetInstanceFormBootstrap(instance, "Task_1", null, false, "nb")
        );

        Assert.Contains("Multiple data elements found for data type 'submodel'", ex.Message);
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_PassesLanguageToFormDataReader()
    {
        var instance = CreateTestInstance("Task_1");
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(appMetadata);

        var service = CreateService();
        await service.GetInstanceFormBootstrap(instance, "Task_1", null, false, "nn");

        _formDataReader.Verify(
            x =>
                x.ProcessLoadedFormData(
                    instance,
                    It.Is<DataElement>(d => d.DataType == "model"),
                    It.IsAny<object>(),
                    true,
                    "nn",
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetInstanceFormBootstrap_IgnoresForbiddenWhenPersistingProcessDataReadChanges()
    {
        var instance = CreateTestInstance("Task_1");
        var appMetadata = CreateAppMetadata("model");

        SetupMocks(appMetadata);
        _formDataReader
            .Setup(x =>
                x.ProcessLoadedFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    It.IsAny<bool>(),
                    It.IsAny<string?>(),
                    It.IsAny<Func<object, CancellationToken, Task>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    Instance _,
                    DataElement _,
                    object appModel,
                    bool _,
                    string? _,
                    Func<object, CancellationToken, Task>? _,
                    CancellationToken _
                ) =>
                {
                    ((DummyModel)appModel).Name = "changed";
                    return appModel;
                }
            );
        _dataClient
            .Setup(x =>
                x.UpdateBinaryData(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Stream>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new PlatformHttpException(new HttpResponseMessage(HttpStatusCode.Forbidden), "Forbidden"));

        var service = CreateService();

        var result = await service.GetInstanceFormBootstrap(instance, "Task_1", null, false, "nb");

        Assert.True(result.DataModels.ContainsKey("model"));
        _dataClient.Verify(
            x =>
                x.UpdateBinaryData(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Stream>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    private static Instance CreateTestInstance(
        string taskId,
        bool locked = false,
        string? defaultDataElementId = null,
        string? submodelDataElementId = null,
        bool includeExtraSubmodelElement = false
    )
    {
        var elementId = defaultDataElementId ?? Guid.NewGuid().ToString();
        var data = new List<DataElement>
        {
            new()
            {
                Id = elementId,
                DataType = "model",
                Locked = locked,
                ContentType = "application/xml",
            },
            new()
            {
                Id = submodelDataElementId ?? Guid.NewGuid().ToString(),
                DataType = "submodel",
                Locked = false,
                ContentType = "application/xml",
            },
        };

        if (includeExtraSubmodelElement)
        {
            data.Add(
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = "submodel",
                    Locked = false,
                    ContentType = "application/xml",
                }
            );
        }

        return new Instance
        {
            Id = "12345/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = data,
        };
    }

    private static ApplicationMetadata CreateAppMetadata(params string[] dataTypes) =>
        CreateAppMetadata(typeof(DummyModel), dataTypes);

    private static ApplicationMetadata CreateAppMetadata(Type modelType, params string[] dataTypes)
    {
        var allDataTypes = dataTypes.Append("submodel").Distinct().ToArray();
        return new ApplicationMetadata("ttd/test")
        {
            DataTypes = allDataTypes
                .Select(dt => new DataType
                {
                    Id = dt,
                    AppLogic = new ApplicationLogic { ClassRef = modelType.FullName! },
                    AllowedContentTypes = ["application/xml"],
                })
                .ToList(),
        };
    }

    private void SetupMocks(
        ApplicationMetadata appMetadata,
        string uiFolder = "Task_1",
        string dataType = "model",
        bool hasValidationConfig = false,
        Dictionary<string, List<Dictionary<string, string>>>? staticOptions = null,
        string? layoutsJson = null
    )
    {
        _appResources
            .Setup(x => x.GetLayoutsInFolder(It.IsAny<string>()))
            .Returns(layoutsJson ?? CreateLayoutsJson(staticOptions));
        _appResources.Setup(x => x.GetModelJsonSchema(It.IsAny<string>())).Returns("""{"type": "object"}""");
        _appResources
            .Setup(x => x.GetValidationConfiguration(It.IsAny<string>()))
            .Returns(hasValidationConfig ? """{"validations": []}""" : null);
        _appResources
            .Setup(x => x.GetLayoutSettingsForFolder(uiFolder))
            .Returns(new LayoutSettings { DefaultDataType = dataType });

        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);
        _dataClient
            .Setup(x =>
                x.GetDataBytes(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new ModelSerializationService(_appModel).SerializeToXml(new DummyModel()).ToArray());
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
        _validationService
            .Setup(x =>
                x.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<string>(),
                    null,
                    true,
                    It.IsAny<string>()
                )
            )
            .ReturnsAsync([]);
        _formDataReader
            .Setup(x => x.ReadStatelessFormData(It.IsAny<object>(), It.IsAny<string?>(), It.IsAny<InstanceOwner?>()))
            .Returns(Task.CompletedTask);

        _formDataReader
            .Setup(x =>
                x.ProcessLoadedFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    It.IsAny<bool>(),
                    It.IsAny<string?>(),
                    It.IsAny<Func<object, CancellationToken, Task>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    Instance _,
                    DataElement _,
                    object appModel,
                    bool _,
                    string? _,
                    Func<object, CancellationToken, Task>? _,
                    CancellationToken _
                ) => appModel
            );
    }

    private void SetupStatelessMocks(
        ApplicationMetadata appMetadata,
        string uiFolder = "stateless",
        string dataType = "model",
        string? layoutsJson = null
    )
    {
        _appResources.Setup(x => x.GetLayoutsInFolder(It.IsAny<string>())).Returns(layoutsJson ?? CreateLayoutsJson());
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

        // Default to unauthenticated - GetStatelessInstanceOwner returns null so only query-parameter prefill can run.
        _authenticationContext.Setup(x => x.Current).Returns(TestAuthentication.GetNoneAuthentication());
        _formDataReader
            .Setup(x => x.ReadStatelessFormData(It.IsAny<object>(), It.IsAny<string?>(), It.IsAny<InstanceOwner?>()))
            .Returns(Task.CompletedTask);
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

public class RowIdDummyModel
{
    public List<RowIdDummyItem> Items { get; set; } = [];
}

public class RowIdDummyItem
{
    [JsonPropertyName("altinnRowId")]
    public Guid AltinnRowId { get; set; }
}
