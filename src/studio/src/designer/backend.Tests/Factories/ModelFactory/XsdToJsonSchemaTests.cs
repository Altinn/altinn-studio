using System;
using System.IO;
using System.Reflection;
using System.Text;
using System.Xml;
using System.Xml.Schema;

using Altinn.Studio.Designer.Factories.ModelFactory;

using Manatee.Json.Schema;

using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    /// <summary>
    /// Represents a collection of tests of the <see cref="XsdToJsonSchema"/> class.
    /// </summary>
    public class XsdToJsonSchemaTests
    {
        [Fact]
        public void AsJsonSchema_ConvertXsdToJsonSchema_CorrectNumberOfPropertiesAndDefinitions()
        {
            // Arrange
            XmlReader xsdReader = XmlReader.Create(LoadTestData("Model/Xsd/melding-1603-12392.xsd"));
            XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);

            // Act
            JsonSchema actual = target.AsJsonSchema();

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(12, actual.Properties().Count);
            Assert.Equal(19, actual.Definitions().Count);
        }

        [Fact]
        public void ConvertXsdToJsonSchemaAndBack_CorrectNumberOfPropertiesAndDefinitions()
        {
                // Arrange
                XmlReader xsdReader = XmlReader.Create(LoadTestData("Model/xsd/melding-1603-12392.xsd"));
                XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);
                xsdReader.Close();

                // Act
                JsonSchema actual = target.AsJsonSchema();

                // Assert
                Assert.NotNull(actual);
                Assert.Equal(12, actual.Properties().Count);
                Assert.Equal(19, actual.Definitions().Count);                  
        }
        
        private Stream LoadTestData(string resourceName)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(XsdToJsonSchemaTests).Assembly.CodeBase).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            Stream resource = File.OpenRead(unitTestFolder + resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data.");
            }

            return resource;
        }
    }
}
