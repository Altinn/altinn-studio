using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Assertions;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests
{
    public class JsonSchemaToXmlTests
    {
        private static readonly Encoding SafeUtf8 = new UTF8Encoding(false, true);

        private static async Task TestFiles(string schemaPath, string expectedPath)
        {
            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();

            JsonSchemaToXmlSchemaConverter converter = new JsonSchemaToXmlSchemaConverter();

            JsonSchema jsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(schemaPath);
            XmlSchema expected = ResourceHelpers.LoadXmlSchemaTestData(expectedPath);

            // Act
            XmlSchema actual = converter.Convert(jsonSchema);

            StringBuilder xmlStringBuilder = new StringBuilder();
            await using (XmlWriter xmlWriter = XmlWriter.Create(xmlStringBuilder, new XmlWriterSettings
            {
                Async = true,
                CheckCharacters = true,
                ConformanceLevel = ConformanceLevel.Document,
                Indent = true,
                Encoding = SafeUtf8,
                OmitXmlDeclaration = false
            }))
            {
                actual.Write(xmlWriter);
            }

            string xsd = xmlStringBuilder.ToString();

            // Assert
            XmlSchemaAssertions.IsEquivalentTo(expected, actual);
        }

        [Fact]
        public async Task SimpleAll()
        {
            await TestFiles("Model/JsonSchema/SimpleAll.json", "Model/XmlSchema/SimpleAll.xsd");
        }

        [Fact]
        public async Task AltinnAnnotation()
        {
            await TestFiles("Model/JsonSchema/AltinnAnnotation.json", "Model/XmlSchema/AltinnAnnotation.xsd");
        }

        [Fact]
        public async Task Any()
        {
            await TestFiles("Model/JsonSchema/Any.json", "Model/XmlSchema/Any.xsd");
        }

        [Fact]
        public async Task Attributes()
        {
            await TestFiles("Model/JsonSchema/Attributes.json", "Model/XmlSchema/Attributes.xsd");
        }

        [Fact]
        public async Task BuiltinTypes()
        {
            await TestFiles("Model/JsonSchema/BuiltinTypes.json", "Model/XmlSchema/BuiltinTypes.xsd");
        }

        [Fact]
        public async Task SimpleChoice()
        {
            await TestFiles("Model/JsonSchema/SimpleChoice.json", "Model/XmlSchema/SimpleChoice.xsd");
        }

        [Fact]
        public async Task NestedChoice()
        {
            await TestFiles("Model/JsonSchema/NestedChoice.json", "Model/XmlSchema/NestedChoice.xsd");
        }

        [Fact]
        public async Task NestedArrays()
        {
            await TestFiles("Model/JsonSchema/NestedArrays.json", "Model/XmlSchema/NestedArrays.xsd");
        }

        [Fact]
        public async Task NestedWithOptionalChoice()
        {
            await TestFiles("Model/JsonSchema/NestedWithOptionalChoice.json", "Model/XmlSchema/NestedWithOptionalChoice.xsd");
        }

        [Fact]
        public async Task NestedWithArrayChoice()
        {
            await TestFiles("Model/JsonSchema/NestedWithArrayChoice.json", "Model/XmlSchema/NestedWithArrayChoice.xsd");
        }

        [Fact]
        public async Task ComplexContentExtension()
        {
            await TestFiles("Model/JsonSchema/ComplexContentExtension.json", "Model/XmlSchema/ComplexContentExtension.xsd");
        }

        [Fact]
        public async Task ComplexContentRestriction()
        {
            await TestFiles("Model/JsonSchema/ComplexContentRestriction.json", "Model/XmlSchema/ComplexContentRestriction.xsd");
        }

        [Fact]
        public async Task ComplexSchema()
        {
            await TestFiles("Model/JsonSchema/ComplexSchema.json", "Model/XmlSchema/ComplexSchema.xsd");
        }

        [Fact]
        public async Task Definitions()
        {
            await TestFiles("Model/JsonSchema/Definitions.json", "Model/XmlSchema/Definitions.xsd");
        }

        [Fact]
        public async Task ElementAnnotation()
        {
            await TestFiles("Model/JsonSchema/ElementAnnotation.json", "Model/XmlSchema/ElementAnnotation.xsd");
        }

        [Fact]
        public async Task SimpleTypeRestrictions()
        {
            await TestFiles("Model/JsonSchema/SimpleTypeRestrictions.json", "Model/XmlSchema/SimpleTypeRestrictions.xsd");
        }

        [Fact]
        public async Task SimpleSequence()
        {
            await TestFiles("Model/JsonSchema/SimpleSequence.json", "Model/XmlSchema/SimpleSequence.xsd");
        }

        [Fact]
        public async Task NestedSequence()
        {
            await TestFiles("Model/JsonSchema/NestedSequence.json", "Model/XmlSchema/NestedSequence.xsd");
        }

        [Fact]
        public async Task NestedSequences()
        {
            await TestFiles("Model/JsonSchema/NestedSequences.json", "Model/XmlSchema/NestedSequences.xsd");
        }

        [Fact]
        public async Task NestedWithOptionalSequence()
        {
            await TestFiles("Model/JsonSchema/NestedWithOptionalSequence.json", "Model/XmlSchema/NestedWithOptionalSequence.xsd");
        }

        [Fact]
        public async Task NestedWithArraySequence()
        {
            await TestFiles("Model/JsonSchema/NestedWithArraySequence.json", "Model/XmlSchema/NestedWithArraySequence.xsd");
        }

        [Fact]
        public async Task SimpleContentExtension()
        {
            await TestFiles("Model/JsonSchema/SimpleContentExtension.json", "Model/XmlSchema/SimpleContentExtension.xsd");
        }

        [Fact]
        public async Task SimpleContentRestriction()
        {
            await TestFiles("Model/JsonSchema/SimpleContentRestriction.json", "Model/XmlSchema/SimpleContentRestriction.fromJson.xsd");
        }

        [Fact]
        public async Task SimpleTypeList()
        {
            await TestFiles("Model/JsonSchema/SimpleTypeList.json", "Model/XmlSchema/SimpleTypeList.xsd");
        }
    }
}
