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
            using XmlReader xsdReader = XmlReader.Create(LoadTestData("Model/Xsd/Skjema-1603-12392.xsd"));
            XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);

            // Act
            JsonSchema actual = target.AsJsonSchema();

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(12, actual.Properties().Count);
            Assert.Equal(19, actual.Definitions().Count);
        }

        [Fact]
        public void AsJsonSchema_ConvertXsdToJsonSchema_CorrectModelName()
        {
            // Arrange
            using XmlReader xsdReader = XmlReader.Create(LoadTestData("Model/Xsd/RA-0678_M.xsd"));
            XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);

            // Act
            JsonSchema actual = target.AsJsonSchema();

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual.Properties());
            Assert.True(actual.Properties().ContainsKey("melding"));
        }

        [Fact]
        public void ConvertXsdToJsonSchema_CorrectNumberOfPropertiesAndDefinitions()
        {
                // Arrange
                using XmlReader xsdReader = XmlReader.Create(LoadTestData("Model/xsd/Skjema-1603-12392.xsd"));
                XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);

                // Act
                JsonSchema actual = target.AsJsonSchema();

                // Assert
                Assert.NotNull(actual);
                Assert.Equal(12, actual.Properties().Count);
                Assert.Equal(19, actual.Definitions().Count);
        }
        
        private Stream LoadTestData(string resourceName)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(XsdToJsonSchemaTests).Assembly.Location).LocalPath);
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
