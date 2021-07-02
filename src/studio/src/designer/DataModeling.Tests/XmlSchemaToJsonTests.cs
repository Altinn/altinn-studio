using System.Threading.Tasks;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Visitor.Xml;
using DataModeling.Tests.Assertions;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests
{
    public class XmlSchemaToJsonTests
    {
        private static async Task TestFiles(string schemaPath, string expectedPath)
        {
            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();
            XmlSchemaToJsonSchemaConverter converter = new XmlSchemaToJsonSchemaConverter();

            JsonSchema expected = await ResourceHelpers.LoadJsonSchemaTestData(expectedPath);
            XmlSchema xsd = ResourceHelpers.LoadXmlSchemaTestData(schemaPath);

            JsonSchema actual = converter.Convert(xsd);

            // Assert
            JsonSchemaAssertions.IsEquivalentTo(expected, actual);
        }

        [Fact]
        public Task SimpleAll()
        {
            return TestFiles("Model/XmlSchema/SimpleAll.xsd", "Model/JsonSchema/SimpleAll.json");
        }

        [Fact]
        public Task AltinnAnnotation()
        {
            return TestFiles("Model/XmlSchema/AltinnAnnotation.xsd", "Model/JsonSchema/AltinnAnnotation.json");
        }

        [Fact]
        public Task Any()
        {
            return TestFiles("Model/XmlSchema/Any.xsd", "Model/JsonSchema/Any.json");
        }

        [Fact]
        public Task Attributes()
        {
            return TestFiles("Model/XmlSchema/Attributes.xsd", "Model/JsonSchema/Attributes.json");
        }

        [Fact]
        public Task BuiltinTypes()
        {
            return TestFiles("Model/XmlSchema/BuiltinTypes.xsd", "Model/JsonSchema/BuiltinTypes.json");
        }

        [Fact]
        public Task SimpleChoice()
        {
            return TestFiles("Model/XmlSchema/SimpleChoice.xsd", "Model/JsonSchema/SimpleChoice.json");
        }

        [Fact]
        public Task NestedChoice()
        {
            return TestFiles("Model/XmlSchema/NestedChoice.xsd", "Model/JsonSchema/NestedChoice.json");
        }

        [Fact]
        public Task NestedWithOptionalChoice()
        {
            return TestFiles("Model/XmlSchema/NestedWithOptionalChoice.xsd", "Model/JsonSchema/NestedWithOptionalChoice.json");
        }

        [Fact]
        public Task NestedWithArrayChoice()
        {
            return TestFiles("Model/XmlSchema/NestedWithArrayChoice.xsd", "Model/JsonSchema/NestedWithArrayChoice.json");
        }

        [Fact]
        public Task ComplexContentExtension()
        {
            return TestFiles("Model/XmlSchema/ComplexContentExtension.xsd", "Model/JsonSchema/ComplexContentExtension.json");
        }

        [Fact]
        public Task ComplexContentRestriction()
        {
            return TestFiles("Model/XmlSchema/ComplexContentRestriction.xsd", "Model/JsonSchema/ComplexContentRestriction.json");
        }

        [Fact]
        public Task ComplexSchema()
        {
            return TestFiles("Model/XmlSchema/ComplexSchema.xsd", "Model/JsonSchema/ComplexSchema.json");
        }

        [Fact]
        public Task Definitions()
        {
            return TestFiles("Model/XmlSchema/Definitions.xsd", "Model/JsonSchema/Definitions.json");
        }

        [Fact]
        public Task ElementAnnotation()
        {
            return TestFiles("Model/XmlSchema/ElementAnnotation.xsd", "Model/JsonSchema/ElementAnnotation.json");
        }

        [Fact]
        public Task SimpleTypeRestrictions()
        {
            return TestFiles("Model/XmlSchema/SimpleTypeRestrictions.xsd", "Model/JsonSchema/SimpleTypeRestrictions.json");
        }

        [Fact]
        public Task SimpleSequence()
        {
            return TestFiles("Model/XmlSchema/SimpleSequence.xsd", "Model/JsonSchema/SimpleSequence.json");
        }

        [Fact]
        public Task NestedArrays()
        {
            return TestFiles("Model/XmlSchema/NestedArrays.xsd", "Model/JsonSchema/NestedArrays.json");
        }

        [Fact]
        public Task NestedSequence()
        {
            return TestFiles("Model/XmlSchema/NestedSequence.xsd", "Model/JsonSchema/NestedSequence.json");
        }

        [Fact]
        public Task NestedSequences()
        {
            return TestFiles("Model/XmlSchema/NestedSequences.xsd", "Model/JsonSchema/NestedSequences.json");
        }

        [Fact]
        public Task InterleavedNestedSequences()
        {
            return TestFiles("Model/XmlSchema/InterleavedNestedSequences.xsd", "Model/JsonSchema/InterleavedNestedSequences.json");
        }

        [Fact]
        public Task NestedWithOptionalSequence()
        {
            return TestFiles("Model/XmlSchema/NestedWithOptionalSequence.xsd", "Model/JsonSchema/NestedWithOptionalSequence.json");
        }

        [Fact]
        public Task NestedWithArraySequence()
        {
            return TestFiles("Model/XmlSchema/NestedWithArraySequence.xsd", "Model/JsonSchema/NestedWithArraySequence.json");
        }

        [Fact]
        public Task SimpleContentExtension()
        {
            return TestFiles("Model/XmlSchema/SimpleContentExtension.xsd", "Model/JsonSchema/SimpleContentExtension.json");
        }

        [Fact]
        public Task SimpleContentRestriction()
        {
            return TestFiles("Model/XmlSchema/SimpleContentRestriction.xsd", "Model/JsonSchema/SimpleContentRestriction.json");
        }

        [Fact]
        public Task SimpleTypeList()
        {
            return TestFiles("Model/XmlSchema/SimpleTypeList.xsd", "Model/JsonSchema/SimpleTypeList.json");
        }

        [Fact]
        public Task SequenceWithGroupRef()
        {
            return TestFiles("Model/XmlSchema/SimpleTypeList.xsd", "Model/JsonSchema/SimpleTypeList.json");
        }
    }
}
