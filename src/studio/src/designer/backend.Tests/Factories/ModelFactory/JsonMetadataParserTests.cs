using System;
using System.IO;
using System.Reflection;

using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;

using Manatee.Json;
using Manatee.Json.Serialization;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonMetadataParserTests
    {
        [Fact]
        public void CreateModelFromMetadata_InputModelWithRestrictionMinimumAndMaximum_GenerateDataAnnotationWithRangeFromMinToMax()
        {
            // Arrange
            ModelMetadata testData = LoadTestData("Designer.Tests._TestData.Model.Metadata.restriction-total-digits.metadata.json");

            JsonMetadataParser target = new JsonMetadataParser();

            // Act
            string modelClass = target.CreateModelFromMetadata(testData);

            // Assert
            Assert.NotNull(modelClass);
            Assert.Contains("[Range(-7.766279631452242E+18, 7.766279631452242E+18)]", modelClass);
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelWithRestrictionMinLengthAndMaxLength_GenerateDataAnnotationWithMinLengthAndMaxLengthAttributes()
        {
            // Arrange
            ModelMetadata testData = LoadTestData("Designer.Tests._TestData.Model.Metadata.restriction-total-digits.metadata.json");

            JsonMetadataParser target = new JsonMetadataParser();

            // Act
            string modelClass = target.CreateModelFromMetadata(testData);

            // Assert
            Assert.NotNull(modelClass);
            Assert.Contains("[MinLength(1)]", modelClass);
            Assert.Contains("[MaxLength(20)]", modelClass);
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelSpecifiedModelName_GenerateDataAnnotationForRoomElement()
        {
            // Arrange
            ModelMetadata testData = LoadTestData("Designer.Tests._TestData.Model.Metadata.RA-0678_M.metadata.json");

            JsonMetadataParser target = new JsonMetadataParser();

            // Act
            string modelClass = target.CreateModelFromMetadata(testData);

            // Assert
            Assert.NotNull(modelClass);
            Assert.Contains("[XmlRoot(ElementName=\"melding\")]", modelClass);
        }

        private ModelMetadata LoadTestData(string resourceName)
        {
            Assembly assembly = typeof(JsonMetadataParserTests).GetTypeInfo().Assembly;
            using Stream resource = assembly.GetManifestResourceStream(resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data embedded in the test assembly.");
            }

            using StreamReader streamReader = new StreamReader(resource);
            JsonValue jsonValue = JsonValue.Parse(streamReader);
            return new JsonSerializer().Deserialize<ModelMetadata>(jsonValue);
        }
    }
}
