#nullable enable
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Validators;

public class ValidationAppSITests
{
    [Fact]
    public async Task FileScanEnabled_VirusFound_ValidationShouldFail()
    {
        ValidationAppSI validationAppSI = ConfigureMockServicesForValidation();

        var instance = new Instance();
        var dataType = new DataType() { EnableFileScan = true };
        var dataElement = new DataElement() 
        {
            FileScanResult = FileScanResult.Infected
        };

        List<ValidationIssue> validationIssues = await validationAppSI.ValidateDataElement(instance, dataType, dataElement);

        validationIssues.FirstOrDefault(vi => vi.Code == "DataElementFileInfected").Should().NotBeNull();
    }

    [Fact]
    public async Task FileScanEnabled_PendingScanNotEnabled_ValidationShouldNotFail()
    {
        ValidationAppSI validationAppSI = ConfigureMockServicesForValidation();

        var instance = new Instance();
        var dataType = new DataType() { EnableFileScan = true };
        var dataElement = new DataElement()
        {
            FileScanResult = FileScanResult.Pending
        };

        List<ValidationIssue> validationIssues = await validationAppSI.ValidateDataElement(instance, dataType, dataElement);

        validationIssues.FirstOrDefault(vi => vi.Code == "DataElementFileScanPending").Should().BeNull();
    }

    [Fact]
    public async Task FileScanEnabled_PendingScanEnabled_ValidationShouldNotFail()
    {
        ValidationAppSI validationAppSI = ConfigureMockServicesForValidation();

        var instance = new Instance();
        var dataType = new DataType() { EnableFileScan = true, ValidationErrorOnPendingFileScan = true };
        var dataElement = new DataElement()
        {
            FileScanResult = FileScanResult.Pending
        };

        List<ValidationIssue> validationIssues = await validationAppSI.ValidateDataElement(instance, dataType, dataElement);

        validationIssues.FirstOrDefault(vi => vi.Code == "DataElementFileScanPending").Should().NotBeNull();
    }

    [Fact]
    public async Task FileScanEnabled_Clean_ValidationShouldNotFail()
    {
        ValidationAppSI validationAppSI = ConfigureMockServicesForValidation();

        var instance = new Instance();
        var dataType = new DataType() { EnableFileScan = true, ValidationErrorOnPendingFileScan = true };
        var dataElement = new DataElement()
        {
            FileScanResult = FileScanResult.Clean
        };

        List<ValidationIssue> validationIssues = await validationAppSI.ValidateDataElement(instance, dataType, dataElement);

        validationIssues.FirstOrDefault(vi => vi.Code == "DataElementFileInfected").Should().BeNull();
        validationIssues.FirstOrDefault(vi => vi.Code == "DataElementFileScanPending").Should().BeNull();
    }

    private static ValidationAppSI ConfigureMockServicesForValidation()
    {
        Mock<ILogger<ValidationAppSI>> loggerMock = new();
        var dataMock = new Mock<IData>();
        var instanceMock = new Mock<IInstance>();
        var instanceValidator = new Mock<IInstanceValidator>();
        var appModelMock = new Mock<IAppModel>();
        var appResourcesMock = new Mock<IAppResources>();
        var appMetadataMock = new Mock<IAppMetadata>();
        var objectModelValidatorMock = new Mock<IObjectModelValidator>();
        var layoutEvaluatorStateInitializer = new LayoutEvaluatorStateInitializer(appResourcesMock.Object, Microsoft.Extensions.Options.Options.Create(new Configuration.FrontEndSettings()));
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var generalSettings = Microsoft.Extensions.Options.Options.Create(new Configuration.GeneralSettings());
        var appSettings = Microsoft.Extensions.Options.Options.Create(new Configuration.AppSettings());

        var validationAppSI = new ValidationAppSI(
            loggerMock.Object,
            dataMock.Object,
            instanceMock.Object,
            instanceValidator.Object,
            appModelMock.Object,
            appResourcesMock.Object,
            appMetadataMock.Object,
            objectModelValidatorMock.Object,
            layoutEvaluatorStateInitializer,
            httpContextAccessorMock.Object,
            generalSettings,
            appSettings);
        return validationAppSI;
    }

    [Fact]
    public void ModelKeyToField_NullInputWithoutType_ReturnsNull()
    {
        ValidationAppSI.ModelKeyToField(null, null!).Should().BeNull();
    }

    [Fact]
    public void ModelKeyToField_StringInputWithoutType_ReturnsSameString()
    {
        ValidationAppSI.ModelKeyToField("null", null!).Should().Be("null");
    }

    [Fact]
    public void ModelKeyToField_NullInput_ReturnsNull()
    {
        ValidationAppSI.ModelKeyToField(null, typeof(TestModel)).Should().BeNull();
    }

    [Fact]
    public void ModelKeyToField_StringInput_ReturnsSameString()
    {
        ValidationAppSI.ModelKeyToField("null", typeof(TestModel)).Should().Be("null");
    }
    
    [Fact]
    public void ModelKeyToField_StringInputWithAttr_ReturnsMappedString()
    {
        ValidationAppSI.ModelKeyToField("FirstLevelProp", typeof(TestModel)).Should().Be("level1");
    }
    
    [Fact]
    public void ModelKeyToField_SubModel_ReturnsMappedString()
    {
        ValidationAppSI.ModelKeyToField("SubTestModel.DecimalNumber", typeof(TestModel)).Should().Be("sub.decimal");
    }

    [Fact]
    public void ModelKeyToField_SubModelNullable_ReturnsMappedString()
    {
        ValidationAppSI.ModelKeyToField("SubTestModel.StringNullable", typeof(TestModel)).Should().Be("sub.nullableString");
    }

    [Fact]
    public void ModelKeyToField_SubModelWithSubmodel_ReturnsMappedString()
    {
        ValidationAppSI.ModelKeyToField("SubTestModel.StringNullable", typeof(TestModel)).Should().Be("sub.nullableString");
    }

    [Fact]
    public void ModelKeyToField_SubModelNull_ReturnsMappedString()
    {
        ValidationAppSI.ModelKeyToField("SubTestModelNull.DecimalNumber", typeof(TestModel)).Should().Be("subnull.decimal");
    }

    [Fact]
    public void ModelKeyToField_SubModelNullNullable_ReturnsMappedString()
    {
        ValidationAppSI.ModelKeyToField("SubTestModelNull.StringNullable", typeof(TestModel)).Should().Be("subnull.nullableString");
    }

    [Fact]
    public void ModelKeyToField_SubModelNullWithSubmodel_ReturnsMappedString()
    {
        ValidationAppSI.ModelKeyToField("SubTestModelNull.StringNullable", typeof(TestModel)).Should().Be("subnull.nullableString");
    }

    // Test lists
    [Fact]
    public void ModelKeyToField_List_IgnoresMissingIndex()
    {
        ValidationAppSI.ModelKeyToField("SubTestModelList.StringNullable", typeof(TestModel)).Should().Be("subList.nullableString");
    }

    [Fact]
    public void ModelKeyToField_List_ProxiesIndex()
    {
        ValidationAppSI.ModelKeyToField("SubTestModelList[123].StringNullable", typeof(TestModel)).Should().Be("subList[123].nullableString");
    }

    [Fact]
    public void ModelKeyToField_ListOfList_ProxiesIndex()
    {
        ValidationAppSI.ModelKeyToField("SubTestModelList[123].ListOfDecimal[5]", typeof(TestModel)).Should().Be("subList[123].decimalList[5]");
    }

    [Fact]
    public void ModelKeyToField_ListOfList_IgnoresMissing()
    {
        ValidationAppSI.ModelKeyToField("SubTestModelList[123].ListOfDecimal", typeof(TestModel)).Should().Be("subList[123].decimalList");
    }

    [Fact]
    public void ModelKeyToField_ListOfListNullable_IgnoresMissing()
    {
        ValidationAppSI.ModelKeyToField("SubTestModelList[123].ListOfNullableDecimal", typeof(TestModel)).Should().Be("subList[123].nullableDecimalList");
    }

    [Fact]
    public void ModelKeyToField_ListOfListOfListNullable_IgnoresMissingButPropagatesOthers()
    {
        ValidationAppSI.ModelKeyToField("SubTestModelList[123].SubTestModelList.ListOfNullableDecimal[123456]", typeof(TestModel)).Should().Be("subList[123].subList.nullableDecimalList[123456]");
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