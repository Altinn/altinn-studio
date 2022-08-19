using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.DataModeling.Utils;
using FluentAssertions;
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
            var idKeyword = jsonSchema.GetKeyword<IdKeyword>();
            idKeyword.Id.Should().Be(expectedId);

            var infoKeyword = jsonSchema.GetKeyword<InfoKeyword>();
            var value = infoKeyword.Value;
            value.GetProperty("meldingsnavn").GetString().Should().Be("melding");
            value.GetProperty("modellnavn").GetString().Should().Be("melding-modell");

            var messageType = jsonSchema.FollowReference(JsonPointer.Parse("#/$defs/melding-modell")).Should().NotBeNull();
        }

        [Fact]
        public void TemplateShouldBeValidSeresXsd()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var id = "https://dev.altinn.studio/org/repository/app/model/model.schema.json";
            var jsonSeresTemplate = new SeresJsonTemplate(new Uri(id), "melding");
            JsonSchema jsonSchema = JsonSchema.FromText(jsonSeresTemplate.GetJsonString());

            XmlSchema xsd = ConvertJsonSchema(jsonSchema);

            xsd.Items.Count.Should().Be(3);
            xsd.Items[2].GetName().Should().Be("melding-modell");

            XmlSchemaComplexType complexType = xsd.Items[2].As<XmlSchemaComplexType>();
            var attributes = complexType.Attributes.Count.Should().Be(3);

            foreach (XmlSchemaAttribute attribute in complexType.Attributes)
            {
                if (attribute.Name == "dataFormatProvider")
                {
                    attribute.FixedValue.Should().Be("SERES");
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
