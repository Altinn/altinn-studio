using System;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Json.Schema.Keywords;
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
            JsonSchema jsonSchema = JsonSchema.FromText(
                actualJsonTemplate.GetJsonString(),
                JsonSchemaKeywords.GetBuildOptions()
            );
            var idKd = jsonSchema.FindKeywordByHandler<IdKeyword>();
            Assert.Equal(expectedId, ((Uri)idKd.Value).ToString());

            Assert.Equal(expectedModelName, jsonSchema.FindKeywordByHandler<XsdRootElementKeyword>().Value);
            var propertiesKd = jsonSchema.FindKeywordByHandler<PropertiesKeyword>();
            var properties = propertiesKd.GetPropertiesDictionary();

            Assert.NotEmpty(properties);
            Assert.Equal(3, properties.Count);
        }
    }
}
