using System;
using System.Linq;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;
using FluentAssertions;
using Json.Schema;
using Xunit;
using Xunit.Abstractions;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonSchemaToMetamodelConverterTests
    {
        private readonly ITestOutputHelper _outputHelper;

        public JsonSchemaToMetamodelConverterTests(ITestOutputHelper outputHelper)
        {
            _outputHelper = outputHelper;
        }

        [Theory]
        [InlineData("Model/Xsd/SeresBasicSchema.xsd")]
        public void Convert_FromSeresSchema_ShouldConvert(string xsdSchemaPath)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            XmlSchema originalXsd = TestDataHelper.LoadXmlSchemaTestData(xsdSchemaPath);

            // Convert the Seres XSD to JSON Schema
            var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
            JsonSchema convertedJsonSchema = xsdToJsonConverter.Convert(originalXsd);
            var convertedJsonSchemaString = JsonSerializer.Serialize(convertedJsonSchema, new JsonSerializerOptions() { Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement), WriteIndented = true });

            // Convert to Metadata model
            var metamodelConverter = new JsonSchemaToMetamodelConverter();
            metamodelConverter.KeywordProcessed += KeywordProcessedHandler;
            metamodelConverter.SubSchemaProcessed += SubSchemaProcessedHandler;

            var metamodel = metamodelConverter.Convert("test", convertedJsonSchemaString);

            metamodel.Elements.Should().HaveCount(3);

            var e1 = metamodel.Elements.First(e => e.Value.ID == "test.melding-modell.e1");
            e1.Value.ParentElement.Should().Be("test.melding-modell");
            e1.Value.Name.Should().Be("e1");
            e1.Value.TypeName.Should().Be("e1");
            e1.Value.XsdValueType.Should().Be(BaseValueType.String);

            var melding = metamodel.Elements.First(e => e.Value.ID == "test.melding-modell");
            melding.Value.ParentElement.Should().Be("test");
            melding.Value.Name.Should().Be("melding-modell");
            melding.Value.TypeName.Should().Be(string.Empty);

            //var test = metamodel.Elements.First(e => e.Value.ID == "test");
            //test.Value.ParentElement.Should().Be(string.Empty);
            //test.Value.Name.Should().Be("test");
            //test.Value.TypeName.Should().Be("test");
        }

        public void KeywordProcessedHandler(object sender, KeywordProcessedEventArgs e)
        {
            _outputHelper.WriteLine($"Processed keyword {e.Keyword.Keyword()} at {e.Path.Source}");
        }

        public void SubSchemaProcessedHandler(object sender, SubSchemaProcessedEventArgs e)
        {
            _outputHelper.WriteLine($"Processed sub-schema at {e.Path.Source}");
        }
    }
}
