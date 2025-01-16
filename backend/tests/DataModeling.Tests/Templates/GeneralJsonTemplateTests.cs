using System;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Templates
{
    public class GeneralJsonTemplateTests
    {
        [Fact]
        public void Constructor_TemplateExists_ShouldSetCorrectValues()
        {
            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();

            string expectedId = "https://dev.altinn.studio/org/repository/app/model/model.schema.json";
            string expectedModelName = "model";

            // Act
            var actualJsonTemplate = new GeneralJsonTemplate(new Uri(expectedId), expectedModelName);

            // Assert
            JsonSchema jsonSchema = JsonSchema.FromText(actualJsonTemplate.GetJsonString());
            var idKeyword = jsonSchema.GetKeywordOrNull<IdKeyword>();
            Assert.Equal(expectedId, idKeyword.Id.ToString());

            Assert.Equal(expectedModelName, jsonSchema.GetKeywordOrNull<XsdRootElementKeyword>().Value);
            var properties = jsonSchema.GetKeywordOrNull<PropertiesKeyword>();

            Assert.NotEmpty(properties.Properties);
            Assert.Equal(3, properties.Properties.Count);
        }
    }
}
