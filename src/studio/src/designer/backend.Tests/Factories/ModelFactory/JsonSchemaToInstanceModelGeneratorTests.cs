using System;
using System.IO;
using System.Reflection;
using System.Xml;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonSchemaToInstanceModelGeneratorTests
    {
        [Fact]
        public void GetModelMetadata_LoadSchema()
        {
            // Arrange
            JsonSchema testData = LoadTestData("Designer.Tests._TestData.JsonSchema.melding-1603-12392.json");

            JsonSchemaToInstanceModelGenerator target =
                new JsonSchemaToInstanceModelGenerator("parse", "test", testData);

            // Act
            ModelMetadata actual = target.GetModelMetadata();

            // Assert
            Assert.NotNull(actual);
        }

        [Fact]
        public void GetModelMetadata_RepeatingGroupHasCorrectDataBinding()
        {
            // Arrange
            JsonSchema testData = LoadTestData("Designer.Tests._TestData.JsonSchema.melding-1603-12392.json");

            JsonSchemaToInstanceModelGenerator target =
                new JsonSchemaToInstanceModelGenerator("parse", "test", testData);

            // Act
            ModelMetadata actual = target.GetModelMetadata();

            // Assert
            Assert.NotNull(actual);

            ElementMetadata repeatingGroup = actual.Elements["Skjema.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788"];

            Assert.NotNull(repeatingGroup);
            Assert.Equal(999, repeatingGroup.MaxOccurs);
            Assert.Equal("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788", repeatingGroup.DataBindingName);

            ElementMetadata nonRepeatingGroup = actual.Elements["Skjema.Endringsmeldinggrp9786.Avgivergrp9787"];

            Assert.NotNull(nonRepeatingGroup);
            Assert.Equal(1, nonRepeatingGroup.MaxOccurs);
            Assert.Null(nonRepeatingGroup.DataBindingName);
        }

        private JsonSchema LoadTestData(string resourceName)
        {
            Assembly assembly = typeof(JsonSchemaToInstanceModelGeneratorTests).GetTypeInfo().Assembly;
            using Stream resource = assembly.GetManifestResourceStream(resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data embedded in the test assembly.");
            }

            using StreamReader streamReader = new StreamReader(resource);
            JsonValue jsonValue = JsonValue.Parse(streamReader);
            return new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
        }
    }
}
