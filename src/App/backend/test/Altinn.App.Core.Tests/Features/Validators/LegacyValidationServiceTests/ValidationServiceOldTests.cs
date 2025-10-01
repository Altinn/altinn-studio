using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Features.Validation.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features.Validators.LegacyValidationServiceTests;

public class ValidationServiceOldTests
{
    private readonly Mock<ILogger<ValidationService>> _loggerMock = new();
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<ITranslationService> _translationServiceMock = new(MockBehavior.Loose);
    private readonly Mock<IDataElementAccessChecker> _dataElementAccessCheckerMock = new(MockBehavior.Strict);
    private readonly ServiceCollection _serviceCollection = new();

    private readonly ApplicationMetadata _applicationMetadata = new("tdd/test")
    {
        DataTypes = new List<DataType>()
        {
            new DataType()
            {
                Id = "test",
                TaskId = "Task_1",
                EnableFileScan = false,
                ValidationErrorOnPendingFileScan = false,
            },
        },
    };

    public ValidationServiceOldTests()
    {
        _dataElementAccessCheckerMock
            .Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>()))
            .ReturnsAsync(true);

        _serviceCollection.AddAppImplementationFactory();
        _serviceCollection.AddSingleton(_loggerMock.Object);
        _serviceCollection.AddSingleton(_dataClientMock.Object);
        _serviceCollection.AddSingleton<IValidationService, ValidationService>();
        _serviceCollection.AddSingleton(_appModelMock.Object);
        _serviceCollection.AddSingleton(_appMetadataMock.Object);
        _serviceCollection.AddSingleton(_translationServiceMock.Object);
        _serviceCollection.AddSingleton<IDataElementValidator, DefaultDataElementValidator>();
        _serviceCollection.AddSingleton<ITaskValidator, DefaultTaskValidator>();
        _serviceCollection.AddSingleton<IValidatorFactory, ValidatorFactory>();
        _serviceCollection.AddSingleton(_dataElementAccessCheckerMock.Object);
        _serviceCollection.AddSingleton(Microsoft.Extensions.Options.Options.Create(new GeneralSettings()));
        _appMetadataMock.Setup(am => am.GetApplicationMetadata()).ReturnsAsync(_applicationMetadata);
    }

    [Fact]
    public async Task FileScanEnabled_VirusFound_ValidationShouldFail()
    {
        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();
        IValidationService validationService = serviceProvider.GetRequiredService<IValidationService>();

        var dataType = new DataType()
        {
            Id = "testScan",
            TaskId = "Task_1",
            EnableFileScan = true,
        };
        _applicationMetadata.DataTypes.Add(dataType);
        var dataElement = new DataElement() { DataType = "testScan", FileScanResult = FileScanResult.Infected };
        var instance = new Instance() { Data = [dataElement] };
        var dataAccessor = new Mock<IInstanceDataAccessor>(MockBehavior.Strict);
        dataAccessor.SetupGet(da => da.Instance).Returns(instance);
        dataAccessor.Setup(da => da.GetDataType(dataType.Id)).Returns(dataType);

        List<ValidationIssueWithSource> validationIssues = await validationService.ValidateInstanceAtTask(
            dataAccessor.Object,
            "Task_1",
            null,
            null,
            null
        );

        validationIssues.Should().ContainSingle(vi => vi.Code == "DataElementFileInfected");
    }

    [Fact]
    public async Task FileScanEnabled_PendingScanNotEnabled_ValidationShouldNotFail()
    {
        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();
        IValidationService validationService = serviceProvider.GetRequiredService<IValidationService>();

        var dataType = new DataType()
        {
            Id = "test",
            TaskId = "Task_1",
            AppLogic = null,
            EnableFileScan = true,
        };
        var dataElement = new DataElement() { DataType = "test", FileScanResult = FileScanResult.Pending };
        var instance = new Instance() { Data = [dataElement] };

        var dataAccessorMock = new Mock<IInstanceDataAccessor>(MockBehavior.Strict);
        dataAccessorMock.SetupGet(da => da.Instance).Returns(instance);
        dataAccessorMock.Setup(da => da.GetDataType(dataType.Id)).Returns(dataType);

        List<ValidationIssueWithSource> validationIssues = await validationService.ValidateInstanceAtTask(
            dataAccessorMock.Object,
            "Task_1",
            null,
            null,
            null
        );

        validationIssues.FirstOrDefault(vi => vi.Code == "DataElementFileScanPending").Should().BeNull();
    }

    [Fact]
    public async Task FileScanEnabled_PendingScanEnabled_ValidationShouldNotFail()
    {
        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();
        IValidationService validationService = serviceProvider.GetRequiredService<IValidationService>();

        var dataType = new DataType()
        {
            Id = "testScan",
            TaskId = "Task_1",
            EnableFileScan = true,
            ValidationErrorOnPendingFileScan = true,
        };
        _applicationMetadata.DataTypes.Add(dataType);
        var dataElement = new DataElement() { DataType = "testScan", FileScanResult = FileScanResult.Pending };
        var instance = new Instance() { Data = [dataElement] };
        var dataAccessorMock = new Mock<IInstanceDataAccessor>(MockBehavior.Strict);
        dataAccessorMock.SetupGet(da => da.Instance).Returns(instance);
        dataAccessorMock.Setup(da => da.GetDataType(dataType.Id)).Returns(dataType);

        List<ValidationIssueWithSource> validationIssues = await validationService.ValidateInstanceAtTask(
            dataAccessorMock.Object,
            "Task_1",
            null,
            null,
            null
        );

        validationIssues.Should().ContainSingle(vi => vi.Code == "DataElementFileScanPending");
    }

    [Fact]
    public async Task FileScanEnabled_Clean_ValidationShouldNotFail()
    {
        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();
        IValidationService validationService = serviceProvider.GetRequiredService<IValidationService>();

        var dataType = new DataType() { EnableFileScan = true, ValidationErrorOnPendingFileScan = true };
        var dataElement = new DataElement() { DataType = "test", FileScanResult = FileScanResult.Clean };
        var instance = new Instance()
        {
            AppId = "ttd/test-app",
            Org = "ttd",
            Data = [dataElement],
        };

        var dataAccessorMock = new InstanceDataAccessorFake(instance, _applicationMetadata, "Task_1", "test")
        {
            { dataElement, new ReadOnlyMemory<byte>() },
        };

        List<ValidationIssueWithSource> validationIssues = await validationService.ValidateInstanceAtTask(
            dataAccessorMock,
            "Task_1",
            null,
            null,
            null
        );

        validationIssues.FirstOrDefault(vi => vi.Code == "DataElementFileInfected").Should().BeNull();
        validationIssues.FirstOrDefault(vi => vi.Code == "DataElementFileScanPending").Should().BeNull();
    }

    [Fact]
    public async Task ValidateAndUpdateProcess_set_canComplete_validationstatus_and_return_empty_list()
    {
        const string taskId = "Task_1";

        // Mock setup
        var dataType = new DataType
        {
            Id = "data",
            TaskId = taskId,
            MaxCount = 0,
        };
        var appMetadata = new ApplicationMetadata("ttd/test-app") { DataTypes = [dataType] };
        _appMetadataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();
        IValidationService validationService = serviceProvider.GetRequiredService<IValidationService>();

        // Testdata
        var instance = new Instance
        {
            Data = new List<DataElement>()
            {
                new() { DataType = "data", ContentType = "application/json" },
            },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var dataAccessorMock = new Mock<IInstanceDataAccessor>(MockBehavior.Strict);
        dataAccessorMock.SetupGet(da => da.Instance).Returns(instance);
        dataAccessorMock.Setup(da => da.GetDataType(dataType.Id)).Returns(dataType);

        var issues = await validationService.ValidateInstanceAtTask(dataAccessorMock.Object, taskId, null, null, null);
        issues.Should().BeEmpty();

        // instance.Process?.CurrentTask?.Validated.CanCompleteTask.Should().BeTrue();
        // instance.Process?.CurrentTask?.Validated.Timestamp.Should().NotBeNull();
    }

    [Fact]
    public async Task ValidateAndUpdateProcess_set_canComplete_false_validationstatus_and_return_list_of_issues()
    {
        const string taskId = "Task_1";

        // Mock setup
        var dataType = new DataType
        {
            Id = "data",
            TaskId = taskId,
            MaxCount = 1,
        };
        var appMetadata = new ApplicationMetadata("ttd/test-app") { DataTypes = [dataType] };
        _appMetadataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();
        IValidationService validationService = serviceProvider.GetRequiredService<IValidationService>();

        // Testdata
        var instance = new Instance
        {
            Data = new List<DataElement>()
            {
                new()
                {
                    Id = "3C8B52A9-9602-4B2E-A217-B4E816ED8DEB",
                    DataType = "data",
                    ContentType = "application/json",
                },
                new()
                {
                    Id = "3C8B52A9-9602-4B2E-A217-B4E816ED8DEC",
                    DataType = "data",
                    ContentType = "application/json",
                },
            },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var dataAccessorMock = new Mock<IInstanceDataAccessor>(MockBehavior.Strict);
        dataAccessorMock.SetupGet(da => da.Instance).Returns(instance);
        dataAccessorMock.Setup(da => da.GetDataType(dataType.Id)).Returns(dataType);

        var issues = await validationService.ValidateInstanceAtTask(dataAccessorMock.Object, taskId, null, null, null);
        issues.Should().HaveCount(1);
        issues.Should().ContainSingle(i => i.Code == ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType);
    }

    [Fact]
    public void ModelKeyToField_NullInputWithoutType_ReturnsNull()
    {
        ModelStateHelpers.ModelKeyToField(null, null!).Should().BeNull();
    }

    [Fact]
    public void ModelKeyToField_StringInputWithoutType_ReturnsSameString()
    {
        ModelStateHelpers.ModelKeyToField("null", null!).Should().Be("null");
    }

    [Fact]
    public void ModelKeyToField_NullInput_ReturnsNull()
    {
        ModelStateHelpers.ModelKeyToField(null, typeof(TestModel)).Should().BeNull();
    }

    [Fact]
    public void ModelKeyToField_StringInput_ReturnsSameString()
    {
        ModelStateHelpers.ModelKeyToField("null", typeof(TestModel)).Should().Be("null");
    }

    [Fact]
    public void ModelKeyToField_StringInputWithAttr_ReturnsMappedString()
    {
        ModelStateHelpers.ModelKeyToField("FirstLevelProp", typeof(TestModel)).Should().Be("level1");
    }

    [Fact]
    public void ModelKeyToField_SubModel_ReturnsMappedString()
    {
        ModelStateHelpers.ModelKeyToField("SubTestModel.DecimalNumber", typeof(TestModel)).Should().Be("sub.decimal");
    }

    [Fact]
    public void ModelKeyToField_SubModelNullable_ReturnsMappedString()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModel.StringNullable", typeof(TestModel))
            .Should()
            .Be("sub.nullableString");
    }

    [Fact]
    public void ModelKeyToField_SubModelWithSubmodel_ReturnsMappedString()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModel.StringNullable", typeof(TestModel))
            .Should()
            .Be("sub.nullableString");
    }

    [Fact]
    public void ModelKeyToField_SubModelNull_ReturnsMappedString()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModelNull.DecimalNumber", typeof(TestModel))
            .Should()
            .Be("subnull.decimal");
    }

    [Fact]
    public void ModelKeyToField_SubModelNullNullable_ReturnsMappedString()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModelNull.StringNullable", typeof(TestModel))
            .Should()
            .Be("subnull.nullableString");
    }

    [Fact]
    public void ModelKeyToField_SubModelNullWithSubmodel_ReturnsMappedString()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModelNull.StringNullable", typeof(TestModel))
            .Should()
            .Be("subnull.nullableString");
    }

    // Test lists
    [Fact]
    public void ModelKeyToField_List_IgnoresMissingIndex()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModelList.StringNullable", typeof(TestModel))
            .Should()
            .Be("subList.nullableString");
    }

    [Fact]
    public void ModelKeyToField_List_ProxiesIndex()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModelList[123].StringNullable", typeof(TestModel))
            .Should()
            .Be("subList[123].nullableString");
    }

    [Fact]
    public void ModelKeyToField_ListOfList_ProxiesIndex()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModelList[123].ListOfDecimal[5]", typeof(TestModel))
            .Should()
            .Be("subList[123].decimalList[5]");
    }

    [Fact]
    public void ModelKeyToField_ListOfList_IgnoresMissing()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModelList[123].ListOfDecimal", typeof(TestModel))
            .Should()
            .Be("subList[123].decimalList");
    }

    [Fact]
    public void ModelKeyToField_ListOfListNullable_IgnoresMissing()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModelList[123].ListOfNullableDecimal", typeof(TestModel))
            .Should()
            .Be("subList[123].nullableDecimalList");
    }

    [Fact]
    public void ModelKeyToField_ListOfListOfListNullable_IgnoresMissingButPropagatesOthers()
    {
        ModelStateHelpers
            .ModelKeyToField("SubTestModelList[123].SubTestModelList.ListOfNullableDecimal[123456]", typeof(TestModel))
            .Should()
            .Be("subList[123].subList.nullableDecimalList[123456]");
    }

    public class TestModel
    {
        [JsonPropertyName("level1")]
        public string FirstLevelProp { get; set; } = default!;

        [JsonPropertyName("sub")]
        public SubTestModel SubTestModel { get; set; } = default!;

        [JsonPropertyName("subnull")]
        public SubTestModel? SubTestModelNull { get; set; } = default!;

        [JsonPropertyName("subList")]
        public List<SubTestModel> SubTestModelList { get; set; } = default!;
    }

    public class SubTestModel
    {
        [JsonPropertyName("decimal")]
        public decimal DecimalNumber { get; set; } = default!;

        [JsonPropertyName("nullableString")]
        public string? StringNullable { get; set; } = default!;

        [JsonPropertyName("decimalList")]
        public List<decimal> ListOfDecimal { get; set; } = default!;

        [JsonPropertyName("nullableDecimalList")]
        public List<decimal?> ListOfNullableDecimal { get; set; } = default!;

        [JsonPropertyName("subList")]
        public List<SubTestModel> SubTestModelList { get; set; } = default!;
    }
}
