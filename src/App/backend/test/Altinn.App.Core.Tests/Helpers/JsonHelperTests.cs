using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Helpers;

public class JsonHelperTests
{
    /// <summary>
    /// Helper method to setup and get the dictionary of the diffs
    /// </summary>
    public async Task<Dictionary<string, object?>?> DoTest<TModel>(
        TModel model,
        Func<TModel, bool> processDataWriteImpl
    )
        where TModel : class
    {
        var instance = new Instance();
        var logger = new Mock<ILogger>().Object;
        var guid = Guid.Empty;
        var dataProcessorMock = new Mock<IDataProcessor>();
        Func<Instance, Guid, object, object?, string?, Task<bool>> dataProcessWrite = (
            instance,
            guid,
            model,
            previousModel,
            language
        ) => Task.FromResult(processDataWriteImpl((TModel)model));
        dataProcessorMock
            .Setup(
                (d) =>
                    d.ProcessDataWrite(
                        It.IsAny<Instance>(),
                        It.IsAny<Guid>(),
                        It.IsAny<object>(),
                        It.IsAny<object?>(),
                        null
                    )
            )
            .Returns(dataProcessWrite);

        return await JsonHelper.ProcessDataWriteWithDiff(
            instance,
            guid,
            model,
            language: null,
            new IDataProcessor[] { dataProcessorMock.Object },
            logger
        );
    }

    public class TestModel
    {
        public int IntegerTest { get; set; }

        public int? NullableIntTest { get; set; }

        public decimal DecimalTest { get; set; }

        public decimal? NullableDecimalTest { get; set; }

        public string StringTest { get; set; } = null!;

        public string? NullableStringTest { get; set; }

        // [Newtonsoft.Json.JsonProperty("jsonPropertyName")]
        [JsonPropertyName("jsonPropertyName")]
        public string? NotJsonPropertyNameTest { get; set; }

        // [JsonPropertyName("newtonsoftString")]
        [Newtonsoft.Json.JsonProperty("newtonsoftString")]
        public string? NewtonsoftAttributeWorks { get; set; }

        public TestModel? RecursiveTest { get; set; }

        public TestModel NonNullableRecursiveTest { get; set; } = default!;

        public List<int> PrimitiveList { get; set; } = default!;

        public List<TestModel> ListTest { get; set; } = default!;

        public List<TestModel>? NullableListTest { get; set; }
    }

    [Fact]
    public async Task SimpleNoChangeTest()
    {
        var data = new TestModel();
        var diff = await DoTest(data, (model) => false);
        diff.Should().BeNull();
    }

    [Fact]
    public async Task InitializingPropertiesLeadsToNoDiff()
    {
        var data = new TestModel();
        var diff = await DoTest(
            data,
            (model) =>
            {
                model.ListTest = new();
                model.PrimitiveList = new();
                model.NullableListTest = new();
                return true;
            }
        );

        diff.Should().BeNull();
    }

    [Fact]
    public async Task InitializingNonNullablePropertiesCreatesDiff()
    {
        var data = new TestModel();
        var diff = await DoTest(
            data,
            (model) =>
            {
                model.RecursiveTest = new();
                return true;
            }
        );

        // Not sure if RecursiveTest should be null here, but apparently it does not hurt
        diff.Should()
            .Equal(
                new Dictionary<string, object?>()
                {
                    { "RecursiveTest.IntegerTest", 0 },
                    { "RecursiveTest.DecimalTest", 0M },
                    { "RecursiveTest", null },
                }
            );
    }

    [Fact]
    public async Task NullIsNotZero()
    {
        var data = new TestModel() { NullableIntTest = null };
        var diff = await DoTest(
            data,
            (model) =>
            {
                model.NullableIntTest = 0;
                return true;
            }
        );

        diff.Should().Contain("NullableIntTest", 0);
        diff.Should().HaveCount(1);
    }

    [Fact]
    public async Task ZeroIsNotNull()
    {
        var data = new TestModel() { NullableIntTest = 0 };
        var diff = await DoTest(
            data,
            (model) =>
            {
                model.NullableIntTest = null;
                return true;
            }
        );

        diff.Should().Contain("NullableIntTest", null);
        diff.Should().HaveCount(1);
    }

    [Fact]
    public async Task TestSystemTextJsonAnnotation()
    {
        var data = new TestModel() { NotJsonPropertyNameTest = "Original Value" };
        var diff = await DoTest(
            data,
            (model) =>
            {
                model.NotJsonPropertyNameTest = "New Value";
                return true;
            }
        );

        diff.Should().Equal(new Dictionary<string, object?> { { "jsonPropertyName", "New Value" } });
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(10)]
    [InlineData(100)]
    [InlineData(int.MinValue)]
    [InlineData(int.MaxValue)]
    public async Task ChangeInteger(int value)
    {
        var data = new TestModel() { RecursiveTest = new(), PrimitiveList = new() };

        var diff = await DoTest(
            data,
            (model) =>
            {
                model.IntegerTest = value;
                model.NullableIntTest = value;
                model.RecursiveTest ??= new();
                model.RecursiveTest.IntegerTest = value;
                model.PrimitiveList ??= new();
                model.PrimitiveList.Add(value);
                return true;
            }
        );

        diff.Should()
            .BeEquivalentTo(
                new Dictionary<string, object?>()
                {
                    { "IntegerTest", value },
                    { "NullableIntTest", value },
                    { "RecursiveTest.IntegerTest", value },
                    { "PrimitiveList[0]", value },
                }
            );
    }

    [Theory]
    [InlineData("-1")]
    [InlineData("10")]
    [InlineData("100")]
    [InlineData(int.MinValue)]
    [InlineData(int.MaxValue)]
    [InlineData(long.MinValue)]
    [InlineData(long.MaxValue)]
    [InlineData("9223372036854775808")]
    [InlineData("79228162514264337593543950335")]
    [InlineData("-79228162514264337593543950334")]
    public async Task ChangeDecimal(object rawValue)
    {
        var value = rawValue switch
        {
            string stringValue => decimal.Parse(stringValue),
            int intValue => (decimal)intValue,
            long longValue => (decimal)longValue,
            _ => throw new NotImplementedException(),
        };
        var data = new TestModel()
        {
            RecursiveTest = new(),
            ListTest = new() { new() },
            NullableListTest = new() { new() },
        };
        var diff = await DoTest(
            data,
            (model) =>
            {
                model.DecimalTest = value;
                model.NullableDecimalTest = value;
                model.RecursiveTest ??= new();
                model.RecursiveTest.DecimalTest = value;
                model.NullableListTest ??= new();
                model.NullableListTest[0].DecimalTest = value;
                model.ListTest ??= new();
                model.ListTest[0].DecimalTest = value;
                return true;
            }
        );

        // casting is weird (the current implementation of diff returns System.Numerics.BigInteger for large numbers)
        Func<object, bool> isMatch = x => (decimal?)(dynamic?)x == value;

        diff.Should().ContainKey("DecimalTest").WhoseValue.Should().Match(x => isMatch(x));
        diff.Should().ContainKey("NullableDecimalTest").WhoseValue.Should().Match(x => isMatch(x));
        diff.Should().ContainKey("RecursiveTest.DecimalTest").WhoseValue.Should().Match(x => isMatch(x));
        diff.Should().ContainKey("NullableListTest[0].DecimalTest").WhoseValue.Should().Match(x => isMatch(x));
        diff.Should().ContainKey("ListTest[0].DecimalTest").WhoseValue.Should().Match(x => isMatch(x));
        diff.Should().HaveCount(5);
    }
}
