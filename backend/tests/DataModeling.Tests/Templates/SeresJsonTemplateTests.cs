using System;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Templates
{
    public class SeresJsonTemplateTests
    {
        [Fact]
        public void Constructor_TemplateExists_ShouldSetCorrectValues()
        {
            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();

            var expectedId = "https://dev.altinn.studio/org/repository/app/model/model.schema.json";

            // Act
            var actualJsonTemplate = new SeresJsonTemplate(new Uri(expectedId), "melding");

            // Assert
            JsonSchema jsonSchema = JsonSchema.FromText(actualJsonTemplate.GetJsonString());
            var idKeyword = jsonSchema.GetKeywordOrNull<IdKeyword>();
            Assert.Equal(expectedId, idKeyword.Id.ToString());

            var infoKeyword = jsonSchema.GetKeywordOrNull<InfoKeyword>();
            var value = infoKeyword.Value;

            Assert.Equal("melding", value.GetProperty("meldingsnavn").GetString());
            Assert.Equal("melding-modell", value.GetProperty("modellnavn").GetString());

            Assert.NotNull(jsonSchema.FollowReference(JsonPointer.Parse("#/$defs/melding-modell")));
        }

        [Fact]
        public void TemplateShouldBeValidSeresXsd()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var id = "https://dev.altinn.studio/org/repository/app/model/model.schema.json";
            var jsonSeresTemplate = new SeresJsonTemplate(new Uri(id), "melding");
            JsonSchema jsonSchema = JsonSchema.FromText(jsonSeresTemplate.GetJsonString());

            XmlSchema xsd = ConvertJsonSchema(jsonSchema);

            Assert.Equal(3, xsd.Items.Count);
            Assert.Equal("melding-modell", xsd.Items[2].GetName());

            XmlSchemaComplexType complexType = xsd.Items[2] as XmlSchemaComplexType;
            Assert.Equal(3, complexType.Attributes.Count);

            foreach (XmlSchemaAttribute attribute in complexType.Attributes)
            {
                if (attribute.Name == "dataFormatProvider")
                {
                    Assert.Equal("SERES", attribute.FixedValue);
                }
            }
        }

        private static XmlSchema ConvertJsonSchema(JsonSchema jsonSchema)
        {
            var converter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());

            var actualXsd = converter.Convert(jsonSchema);

            return actualXsd;
        }
    }
}
