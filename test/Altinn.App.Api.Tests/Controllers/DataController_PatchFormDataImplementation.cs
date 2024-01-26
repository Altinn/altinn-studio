using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.FileAnalyzis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.FeatureManagement;
using Moq;
using Xunit;
using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.App.Api.Tests.Controllers;

public class DataController_PatchFormDataImplementation : IAsyncDisposable
{
    // Test data
    static readonly Guid DataGuid = new("12345678-1234-1234-1234-123456789123");
    private readonly Instance _instance = new();

    // Service mocks
    private readonly Mock<ILogger<DataController>> _dLoggerMock = new(MockBehavior.Loose);
    private readonly Mock<ILogger<ValidationService>> _vLoggerMock = new(MockBehavior.Loose);
    private readonly Mock<IInstanceClient> _instanceClientMock = new(MockBehavior.Strict);
    private readonly Mock<IInstantiationProcessor> _instantiationProcessorMock = new(MockBehavior.Strict);
    private readonly Mock<IDataClient> _dataClientMock = new (MockBehavior.Strict);
    private readonly Mock<IDataProcessor> _dataProcessorMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new (MockBehavior.Strict);
    private readonly Mock<IAppResources> _appResourcesServiceMock = new (MockBehavior.Strict);
    private readonly Mock<IPrefill> _prefillServiceMock = new (MockBehavior.Strict);
    private readonly Mock<IFileAnalysisService> _fileAnalyserServiceMock = new (MockBehavior.Strict);
    private readonly Mock<IFileValidationService> _fileValidationServiceMock = new (MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new (MockBehavior.Strict);
    private readonly Mock<IFeatureManager> _featureManageMock = new (MockBehavior.Strict);

    // ValidatorMocks
    private readonly Mock<IFormDataValidator> _formDataValidator = new(MockBehavior.Strict);
    private readonly Mock<IDataElementValidator> _dataElementValidator = new(MockBehavior.Strict);

    // System under test
    private readonly ServiceCollection _serviceCollection = new();
    private readonly DataController _dataController;
    private readonly ServiceProvider _serviceProvider;

    public DataController_PatchFormDataImplementation()
    {
        _formDataValidator.Setup(fdv => fdv.DataType).Returns(_dataType.Id);
        _formDataValidator.Setup(fdv => fdv.ValidationSource).Returns("formDataValidator");
        _formDataValidator.Setup(fdv => fdv.HasRelevantChanges(It.IsAny<object>(), It.IsAny<object>())).Returns(true);
        // _dataElementValidator.Setup(ev => ev.DataType).Returns(_dataType.Id);
        _serviceCollection.AddSingleton(_formDataValidator.Object);
        _serviceCollection.AddSingleton(_dataElementValidator);
        _serviceProvider = _serviceCollection.BuildServiceProvider();
        var validationService = new ValidationService(
            _serviceProvider,
            _dataClientMock.Object,
            _appModelMock.Object,
            _appMetadataMock.Object,
            _vLoggerMock.Object
            );
        _dataController = new DataController(
            _dLoggerMock.Object,
            _instanceClientMock.Object,
            _instantiationProcessorMock.Object,
            _dataClientMock.Object,
            new List<IDataProcessor> (){_dataProcessorMock.Object},
            _appModelMock.Object,
            _appResourcesServiceMock.Object,
            _prefillServiceMock.Object,
            validationService,
            _fileAnalyserServiceMock.Object,
            _fileValidationServiceMock.Object,
            _appMetadataMock.Object,
            _featureManageMock.Object
            );
    }

    private readonly DataType _dataType = new()
    {
        Id = "dataTypeId",
    };

    private readonly DataElement _dataElement = new()
    {
        Id = DataGuid.ToString(),
        DataType = "dataTypeId"
    };

    private class MyModel
    {
        [MinLength(20)]
        public string? Name { get; set; }
    }

    [Fact]
    public async Task Test()
    {
        var request = JsonSerializer.Deserialize<DataPatchRequest>("""
            {
                "patch": [
                    {
                        "op": "replace",
                        "path": "/Name",
                        "value": "Test Testesen"
                    }
                ],
                "ignoredValidators": [
                    "required"
                ]
            }
            """)!;
        var oldModel = new MyModel { Name = "OrginaltNavn" };
        var validationIssues = new List<ValidationIssue>()
        {
            new ()
            {
                Severity = ValidationIssueSeverity.Error,
                Description = "First error",
            }
        };

        _dataProcessorMock.Setup(d => d.ProcessDataWrite(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<MyModel>(), It.IsAny<MyModel?>(), null)).Returns((Instance i, Guid j, MyModel data, MyModel? oldData, string? language) => Task.CompletedTask);
        _formDataValidator.Setup(fdv => fdv.ValidateFormData(
            It.Is<Instance>(i => i == _instance),
            It.Is<DataElement>(de=>de == _dataElement),
            It.IsAny<MyModel>()))
            .ReturnsAsync(validationIssues);

        // Act
        var (response, _) = await _dataController.PatchFormDataImplementation(_dataType, _dataElement, request, oldModel, null, _instance);

        // Assert
        response.Should().NotBeNull();
        response.NewDataModel.Should().BeOfType<MyModel>().Subject.Name.Should().Be("Test Testesen");
        var validator = response.ValidationIssues.Should().ContainSingle().Which;
        validator.Key.Should().Be("formDataValidator");
        var issue = validator.Value.Should().ContainSingle().Which;
        issue.Description.Should().Be("First error");
        _dataProcessorMock.Verify(d => d.ProcessDataWrite(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<MyModel>(), It.IsAny<MyModel?>(), null));
    }

    public async ValueTask DisposeAsync()
    {
        await _serviceProvider.DisposeAsync();
    }
}