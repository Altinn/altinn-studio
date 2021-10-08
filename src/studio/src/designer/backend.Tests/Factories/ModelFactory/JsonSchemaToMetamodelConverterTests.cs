using System;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Designer.Tests.Utils;
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

            var metamodel = metamodelConverter.Convert(convertedJsonSchemaString);
        }

        public void KeywordProcessedHandler(object sender, KeywordProcessedEventArgs e)
        {
            _outputHelper.WriteLine($"Processed keyword {e.Keyword.Keyword()} at {e.Path.Source}");
        }
    }
}
