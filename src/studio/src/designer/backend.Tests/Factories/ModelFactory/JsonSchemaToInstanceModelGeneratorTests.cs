using System;
using System.IO;
using System.Reflection;

using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;
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
            JsonSchema testData = TestDataHelper.LoadDataFromEmbeddedResourceAsJsonSchema("Designer.Tests._TestData.Model.JsonSchema.Skjema-1603-12392.json");

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
            JsonSchema testData = TestDataHelper.LoadDataFromEmbeddedResourceAsJsonSchema("Designer.Tests._TestData.Model.JsonSchema.Skjema-1603-12392.json");

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

        [Fact]
        public void GetModelMetadata_RootNameCorrectlyTransferedToModelMetadata()
        {
            // Arrange
            JsonSchema testData = TestDataHelper.LoadDataFromEmbeddedResourceAsJsonSchema("Designer.Tests._TestData.Model.JsonSchema.RA-0678_M.schema.json");

            JsonSchemaToInstanceModelGenerator target =
                new JsonSchemaToInstanceModelGenerator("parse", "test", testData);

            // Act
            ModelMetadata actual = target.GetModelMetadata();

            // Assert
            Assert.NotNull(actual);

            ElementMetadata rootElement = actual.Elements["melding"];

            Assert.NotNull(rootElement);
            Assert.Equal("melding", rootElement.ID);
            Assert.Equal("melding", rootElement.Name);
            Assert.Equal("RA0678_M", rootElement.TypeName);
        }
    }
}
