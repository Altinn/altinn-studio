#nullable enable
using System.Text.Json.Serialization;

using Altinn.App.Core.Features.Validation;
using FluentAssertions;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Validators;

public class ValidationAppSITests
{
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
}