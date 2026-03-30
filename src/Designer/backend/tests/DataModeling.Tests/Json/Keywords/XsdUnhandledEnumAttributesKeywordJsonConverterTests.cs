using System.Collections.Generic;
using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdUnhandledEnumAttributesKeywordJsonConverterTests
    {
        public XsdUnhandledEnumAttributesKeywordJsonConverterTests()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
        }

        [Fact]
        public void Read_ValidJson_ShouldReadFromJson()
        {
            // Arrange
            var jsonSchema =
                @"{""@xsdUnhandledEnumAttributes"":{""frontend"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784952""},""backend"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784951""},""other"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784950""}}}";

            // Act
            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var kd = schema.FindKeywordByHandler<XsdUnhandledEnumAttributesKeyword>();

            // Assert
            Assert.NotNull(kd);
            var properties = (List<NamedKeyValuePairs>)kd.Value;
            Assert.Equal(3, properties.Count);
            Assert.Equal(2, properties.Find(p => p.Name == "frontend").Properties.Count);
            Assert.Equal(2, properties.Find(p => p.Name == "backend").Properties.Count);
            Assert.Equal(2, properties.Find(p => p.Name == "other").Properties.Count);
        }

        [Fact]
        public void Write_ValidStructure_ShouldWriteToJson()
        {
            // Arrange
            var jsonSchema =
                @"{""@xsdUnhandledEnumAttributes"":{""frontend"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784952""},""backend"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784951""},""other"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784950""}}}";

            // Act
            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var serialized = JsonSerializer.Serialize(schema);

            // Assert
            Assert.Equal(jsonSchema, serialized);
        }
    }
}
