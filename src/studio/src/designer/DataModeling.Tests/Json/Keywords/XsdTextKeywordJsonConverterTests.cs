using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using FluentAssertions;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdTextKeywordJsonConverterTests : FluentTestsBase<XsdTextKeywordJsonConverterTests>
    {
        private JsonSchema JsonSchema { get; set; }

        private XsdTextKeyword XsdTextKeyword { get; set; }

        private Stream SerializedKeyword { get; set; }

        public XsdTextKeywordJsonConverterTests()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Read_ValidJson_FromSchema(bool value)
        {
            var jsonSchema = @$"{{
                ""@xsdText"": {value.ToString().ToLower()},
                ""$ref"": ""#/$defs/SomeDef""
            }}";

            Given.That.JsonSchemaLoaded(jsonSchema)
                .When.XsdTextKeywordReadFromSchema()
                .Then.XsdTextKeyword.Should().NotBeNull();

            And.XsdTextKeyword.Value.Should().Be(value);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Write_ValidStructure_ShouldWriteToJson(bool value)
        {
            Given.That.XsdTextKeywordCreatedWithValue(value)
                .When.XsdTextKeywordWrittenToStream()
                .Then.SerializedKeywordShouldBe($@"{{""@xsdText"":{value.ToString().ToLower()}}}");
        }

        [Fact]
        public void DefaultValue_ShouldBe_True()
        {
            XsdTextKeyword = new XsdTextKeyword();
            XsdTextKeyword.Value.Should().Be(false);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void SameKeywords_Should_BeEqual(bool value)
        {
            Given.That.XsdTextKeywordCreatedWithValue(value);
            var expectedKeyword = new XsdTextKeyword(value);

            Assert.True(XsdTextKeyword.Equals(expectedKeyword));
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void SameKeywords_Should_BeEqual_WhenComparingWithObject(bool value)
        {
            Given.That.XsdTextKeywordCreatedWithValue(value);
            object expectedKeyword = new XsdTextKeyword(value);

            Assert.True(XsdTextKeyword.Equals(expectedKeyword));
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void KeywordShouldNotEqual_null(bool value)
        {
            Given.That.XsdTextKeywordCreatedWithValue(value);
            Assert.False(XsdTextKeyword.Equals(null));
        }

        private XsdTextKeywordJsonConverterTests XsdTextKeywordCreatedWithValue(bool value)
        {
            XsdTextKeyword = new XsdTextKeyword(value);
            return this;
        }

        private XsdTextKeywordJsonConverterTests XsdTextKeywordWrittenToStream()
        {
            var keywordConverter = new XsdTextKeyword.XsdTextKeywordJsonConverter();
            SerializedKeyword = new MemoryStream();
            var jsonWriter = new Utf8JsonWriter(SerializedKeyword);
            jsonWriter.WriteStartObject();
            keywordConverter.Write(jsonWriter, XsdTextKeyword, new JsonSerializerOptions());
            jsonWriter.WriteEndObject();
            jsonWriter.Flush();
            return this;
        }

        private XsdTextKeywordJsonConverterTests SerializedKeywordShouldBe(string json)
        {
            SerializedKeyword.Seek(0, SeekOrigin.Begin);
            var streamReader = new StreamReader(SerializedKeyword);
            var jsonText = streamReader.ReadToEnd();

            jsonText.Should().Be(json);
            return this;
        }

        private XsdTextKeywordJsonConverterTests JsonSchemaLoaded(string json)
        {
            JsonSchema = JsonSerializer.Deserialize<JsonSchema>(
                json,
                new JsonSerializerOptions { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
            return this;
        }

        private XsdTextKeywordJsonConverterTests XsdTextKeywordReadFromSchema()
        {
            XsdTextKeyword = JsonSchema.GetKeyword<XsdTextKeyword>();
            return this;
        }
    }
}
