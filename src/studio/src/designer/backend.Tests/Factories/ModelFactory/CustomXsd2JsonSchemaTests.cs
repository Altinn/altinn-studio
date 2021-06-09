using System.Xml;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Designer.Tests.Utils;
using Manatee.Json.Schema;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    public class CustomXsd2JsonSchemaTests
    {
        [Theory]
        [InlineData(@"Model/xsd/statsbygg_custom_unmodified.xsd")]
        [InlineData(@"Model/xsd/statsbygg_custom_modified.xsd")]
        public void AsJsonSchema_ConvertXsdToJsonSchema_CorrectNumberOfPropertiesAndDefinitions(string xsdPath)
        {
            // Arrange
            using XmlReader xsdReader = XmlReader.Create(TestDataHelper.LoadTestDataFromFile(xsdPath));
            XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);

            // Act
            JsonSchema actual = target.AsJsonSchema();            

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual.Properties());
            Assert.Equal(6, actual.Definitions().Count);
        }
    }
}
